"use client";

import { useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

const RequestComponent = ({
  parts = [],
  retailerRequests = [],
  supplyRequests = [],
  onApproveRetailer,
  onFulfillSupply,
  refreshing = false,
}) => {
  const [approvingAddress, setApprovingAddress] = useState(null);
  const [fulfillingId, setFulfillingId] = useState(null);
  const [previewRequestId, setPreviewRequestId] = useState(null);

  const pendingSupplyRequests = supplyRequests.filter((r) => !r.fulfilled);

  const handleApprove = async (address) => {
    if (!onApproveRetailer) return;
    try {
      setApprovingAddress(address);
      await onApproveRetailer(address);
      toast.success("Retailer approved");
    } catch (error) {
      console.log(error);
      toast.error(error?.reason || error?.message || "Failed to approve retailer");
    } finally {
      setApprovingAddress(null);
    }
  };

  // ========== FIND A MATCHING PART (single source of truth) ==========
  const getSourcePart = (request) => {
    // 1. Exact name match (via ethers.id)
    const exact = parts.find((p) => {
      if (!p.partName) return false;
      try {
        return ethers.id(p.partName) === request.productHash;
      } catch {
        return false;
      }
    });
    if (exact) return { part: exact, matched: "exact" };

    // 2. Fallback: any part without a minted tokenId
    const unminted = parts.find((p) => !p.tokenId);
    if (unminted) return { part: unminted, matched: "fallback" };

    // 3. Fallback: any part at all
    if (parts.length > 0) {
      return { part: parts[0], matched: "fallback" };
    }

    return { part: null, matched: "insufficient" };
  };

  // ========== BUILD URIS + HASHES ARRAYS ==========
  const buildFulfillmentArrays = (request) => {
    const { part, matched } = getSourcePart(request);

    if (!part) {
      return { uris: [], hashes: [], matched, part: null };
    }

    if (!part.tokenURI || !part.metadataHash) {
      return { uris: [], hashes: [], matched: "missing-metadata", part };
    }

    // ✅ Repeat the same URI/hash for the requested quantity
    const uris = Array(request.quantity).fill(part.tokenURI);
    const hashes = Array(request.quantity).fill(part.metadataHash);

    return { uris, hashes, matched, part };
  };

  // ========== AUTO-FULFILL ==========
  const handleAutoFulfill = async (request) => {
    if (!onFulfillSupply) return;

    const { uris, hashes, matched, part } = buildFulfillmentArrays(request);

    if (matched === "insufficient" || !part) {
      toast.error("No parts available to fulfill this request");
      return;
    }

    if (matched === "missing-metadata") {
      toast.error("Part is missing tokenURI or metadataHash");
      return;
    }

    if (uris.length !== request.quantity || hashes.length !== request.quantity) {
      toast.error(
        `Need ${request.quantity} URI(s) and hash(es), got ${uris.length} and ${hashes.length}`
      );
      return;
    }

    try {
      setFulfillingId(request.requestId);
      await onFulfillSupply(request.requestId, uris, hashes);
      toast.success(
        `Request #${request.requestId} fulfilled · Minted ${request.quantity} NFT(s)`
      );
      setPreviewRequestId(null);
    } catch (error) {
      console.log(error);
      toast.error(error?.reason || error?.message || "Failed to fulfill request");
    } finally {
      setFulfillingId(null);
    }
  };

  return (
    <div className="mt-6 space-y-10">
      {/* ========== RETAILER REQUESTS ========== */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Retailer Requests</h2>
          <span className="rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-3 py-0.5 text-xs text-[#8FA88A]">
            {retailerRequests.length} pending
          </span>
        </div>

        {refreshing ? (
          <div className="mt-4 py-10 text-center text-white/50 text-sm">
            Loading requests...
          </div>
        ) : retailerRequests.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50 py-10 text-center text-sm text-white/50">
            No pending retailer requests.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {retailerRequests.map((r) => (
              <div
                key={r.address}
                className="rounded-lg border border-[#4A5D48] bg-[#243329] p-4"
              >
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-sm text-white/70 mt-1">{r.location}</p>
                <p className="text-xs text-white/40 mt-2 truncate">{r.address}</p>
                <button
                  onClick={() => handleApprove(r.address)}
                  disabled={approvingAddress === r.address}
                  className="mt-4 w-full rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approvingAddress === r.address
                    ? "Approving..."
                    : "Approve Retailer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== SUPPLY REQUESTS ========== */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Supply Requests</h2>
          <span className="rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-3 py-0.5 text-xs text-[#8FA88A]">
            {pendingSupplyRequests.length} pending
          </span>
        </div>

        {refreshing ? (
          <div className="mt-4 py-10 text-center text-white/50 text-sm">
            Loading requests...
          </div>
        ) : pendingSupplyRequests.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50 py-10 text-center text-sm text-white/50">
            No pending supply requests.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingSupplyRequests.map((req) => {
              const { uris, hashes, matched, part } = buildFulfillmentArrays(req);
              const canFulfill =
                part && uris.length === req.quantity && hashes.length === req.quantity;
              const isPreviewOpen = previewRequestId === req.requestId;

              return (
                <div
                  key={req.requestId}
                  className="rounded-lg border border-[#4A5D48] bg-[#243329] p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        Request #{req.requestId} · Qty {req.quantity}
                      </p>
                      <p className="text-xs text-white/40 mt-1 truncate">
                        From: {req.requester}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        Product hash: {req.productHash}
                      </p>
                      <p className="text-xs text-white/40">
                        Requested: {new Date(req.requestTime * 1000).toLocaleString()}
                      </p>

                      {/* Match status */}
                      <div className="mt-3 flex items-center gap-2">
                        {matched === "exact" && (
                          <span className="rounded-full bg-green-900/40 border border-green-700/50 px-2 py-0.5 text-xs text-green-400">
                            ✅ Matched part: {part?.partName}
                          </span>
                        )}
                        {matched === "fallback" && (
                          <span className="rounded-full bg-yellow-900/40 border border-yellow-700/50 px-2 py-0.5 text-xs text-yellow-400">
                            ⚠️ No exact match — using: {part?.partName}
                          </span>
                        )}
                        {matched === "missing-metadata" && (
                          <span className="rounded-full bg-red-900/40 border border-red-700/50 px-2 py-0.5 text-xs text-red-400">
                            ❌ Part missing tokenURI or metadataHash
                          </span>
                        )}
                        {matched === "insufficient" && (
                          <span className="rounded-full bg-red-900/40 border border-red-700/50 px-2 py-0.5 text-xs text-red-400">
                            ❌ No parts available
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setPreviewRequestId(isPreviewOpen ? null : req.requestId)
                      }
                      disabled={!canFulfill}
                      className="rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isPreviewOpen ? "Hide" : "Fulfill Request"}
                    </button>
                  </div>

                  {/* Preview */}
                  {isPreviewOpen && canFulfill && (
                    <div className="mt-4 space-y-3 border-t border-[#4A5D48] pt-4">
                      <p className="text-xs text-white/50">
                        Will mint {req.quantity} NFT(s) using the metadata from{" "}
                        <span className="text-[#8FA88A] font-medium">
                          {part.partName}
                        </span>
                        :
                      </p>

                      <div className="flex items-center gap-3 rounded-md border border-[#4A5D48] bg-[#1C2620] p-3">
                        {part.image?.url && (
                          <img
                            src={part.image.url}
                            alt={part.partName}
                            className="h-12 w-12 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {part.partName} × {req.quantity}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {part.brandName} · {part.tokenURI?.slice(0, 40)}...
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAutoFulfill(req)}
                        disabled={fulfillingId === req.requestId}
                        className="w-full rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fulfillingId === req.requestId
                          ? "Minting..."
                          : `Confirm & Mint ${req.quantity} NFT(s)`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestComponent;