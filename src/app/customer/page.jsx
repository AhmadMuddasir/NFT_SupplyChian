"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";

const STATUS_NAMES = [
  "NEW",
  "RECALLED",
  "DEFECTIVE_RETURNED",
  "REPAIRED",
  "REFURBISHED",
];

const SALE_STATUS_NAMES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const Page = () => {
  const {
    verifyPartAuthenticity,
    getSaleStatus,
    getNFTCustodian,
    getCustomerPhoneNumber,
  } = useContract();

  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [verifyingMetadata, setVerifyingMetadata] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState(null);

  const handleVerify = async (e) => {
    e?.preventDefault();

    if (!tokenId || isNaN(Number(tokenId))) {
      toast.error("Please enter a valid token ID");
      return;
    }

    setLoading(true);
    setResult(null);
    setMetadataStatus(null);

    try {
      const [dbResult, chainData] = await Promise.all([
        autopartApi.getByTokenId(tokenId).catch(() => null),
        Promise.all([
          verifyPartAuthenticity(tokenId),
          getSaleStatus(tokenId),
          getNFTCustodian(tokenId),
          getCustomerPhoneNumber(tokenId).catch(() => ""),
        ]),
      ]);

      const [authenticity, saleStatus, custodian, phoneNumber] = chainData;

      setResult({
        tokenId: Number(tokenId),
        isAuthentic: authenticity[0],
        partStatus: STATUS_NAMES[Number(authenticity[1])],
        metadataHash: authenticity[2],
        custodian,
        mintedAt: new Date(Number(authenticity[4]) * 1000).toLocaleString(),
        saleStatus: SALE_STATUS_NAMES[Number(saleStatus)],
        phoneNumber,
        dbPart: dbResult?.data?.autoPart || null,
      });

      toast.success("Part verified on-chain!");
    } catch (error) {
      console.error("Verification error:", error);
      if (error?.reason) {
        toast.error(error.reason);
      } else if (error?.message?.includes("does not exist")) {
        toast.error("No part found with that token ID");
      } else {
        toast.error("Failed to verify part");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMetadata = async () => {
    if (!result?.dbPart?.tokenURI || !result?.metadataHash) {
      toast.error("Missing token URI or metadata hash");
      return;
    }

    setVerifyingMetadata(true);
    setMetadataStatus(null);

    try {
      const gatewayUrl = result.dbPart.tokenURI.replace(
        "ipfs://",
        "https://gateway.pinata.cloud/ipfs/"
      );
      const response = await fetch(gatewayUrl);
      if (!response.ok) throw new Error("Failed to fetch metadata from IPFS");

      const metadataText = await response.text();

      const computedHash = ethers.keccak256(
        ethers.toUtf8Bytes(metadataText)
      );

      const matches = computedHash === result.metadataHash;

      setMetadataStatus({
        matches,
        computedHash,
        onChainHash: result.metadataHash,
      });

      if (matches) {
        toast.success(" Metadata is authentic and untampered!");
      } else {
        toast.error(" Metadata has been tampered with!");
      }
    } catch (error) {
      console.error("Metadata verification error:", error);
      toast.error(error.message || "Failed to verify metadata");
    } finally {
      setVerifyingMetadata(false);
    }
  };

  const getSaleStatusStyle = (status) => {
    switch (status) {
      case "UNSOLD":
        return "bg-blue-900/40 border-blue-700/50 text-blue-400";
      case "IN_TRANSIT":
        return "bg-yellow-900/40 border-yellow-700/50 text-yellow-400";
      case "SOLD":
        return "bg-green-900/40 border-green-700/50 text-green-400";
      case "RETURNED":
        return "bg-red-900/40 border-red-700/50 text-red-400";
      default:
        return "bg-white/5 border-white/20 text-white/60";
    }
  };

  return (
    <div className="min-h-screen bg-[#1C2620] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
            Customer Verification
          </span>
          <h1 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            Verify Your Auto Part
          </h1>
          <p className="mt-3 text-sm text-white/60 max-w-xl mx-auto">
            Enter the token ID from your NFT to check authenticity, supply
            chain history, and current ownership — all verified on-chain.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="number"
            placeholder="Enter Token ID (e.g., 1)"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="flex-1 rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-3 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#8FA88A] px-8 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & get Part"}
          </button>
        </form>

        {loading && (
          <div className="mt-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
            <p className="mt-4 text-white/60">Querying blockchain...</p>
          </div>
        )}

        {result && !loading && (
          <div className="mt-10 space-y-4">
            {/* Authenticity Banner */}
            <div
              className={`rounded-xl border p-5 ${
                result.isAuthentic
                  ? "border-green-700/50 bg-green-900/20"
                  : "border-red-700/50 bg-red-900/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                    result.isAuthentic ? "bg-green-900/50" : "bg-red-900/50"
                  }`}
                >
                  {result.isAuthentic ? "Yes" : "No"}
                </div>
                <div>
                  <h2
                    className={`text-lg font-bold ${
                      result.isAuthentic ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {result.isAuthentic
                      ? "Authentic Part"
                      : "Part Recalled — Do Not Use"}
                  </h2>
                  <p className="text-sm text-white/60 mt-0.5">
                    Token #{result.tokenId} · Minted on {result.mintedAt}
                  </p>
                </div>
              </div>
            </div>

            {/* Part Details Card */}
            <div className="rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden">
              {/* Image + Header */}
              {result.dbPart?.image?.url && (
                <img
                  src={result.dbPart.image.url}
                  alt={result.dbPart.partName}
                  className="h-56 w-full object-cover"
                />
              )}

              <div className="p-5 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {result.dbPart?.partName || "Unknown Part"}
                  </h3>
                  {result.dbPart?.brandName && (
                    <p className="text-sm text-white/60 mt-1">
                      {result.dbPart.brandName}
                    </p>
                  )}
                  {result.dbPart?.description && (
                    <p className="text-sm text-white/50 mt-2">
                      {result.dbPart.description}
                    </p>
                  )}
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#4A5D48] bg-[#1C2620] p-3">
                    <p className="text-xs text-white/50">Part Status</p>
                    <p className="text-sm font-semibold text-white mt-1">
                      {result.partStatus}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#4A5D48] bg-[#1C2620] p-3">
                    <p className="text-xs text-white/50">Sale Status</p>
                    <span
                      className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getSaleStatusStyle(
                        result.saleStatus
                      )}`}
                    >
                      {result.saleStatus}
                    </span>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-3 border-t border-[#4A5D48] pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-white/50">
                      Current Custodian
                    </span>
                    <span className="text-xs font-mono text-white/80 truncate text-right">
                      {result.custodian}
                    </span>
                  </div>

                  {result.phoneNumber && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-white/50">
                        Customer Phone
                      </span>
                      <span className="text-xs text-white/80">
                        {result.phoneNumber}
                      </span>
                    </div>
                  )}

                  {result.dbPart?.category && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-white/50">Category</span>
                      <span className="text-xs text-white/80 capitalize">
                        {result.dbPart.category}
                      </span>
                    </div>
                  )}

                  {result.dbPart?.price && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-white/50">Retail Price</span>
                      <span className="text-xs text-white/80">
                        ${result.dbPart.price}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-white/50">
                      Metadata Hash
                    </span>
                    <span className="text-xs font-mono text-white/60 truncate text-right max-w-[200px]">
                      {result.metadataHash}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {result.dbPart?.tokenURI && (
              <div className="rounded-xl border border-[#4A5D48] bg-[#243329] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      🔒 Metadata Integrity Check
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Verify the IPFS metadata hasn't been tampered with
                    </p>
                  </div>
                  <button
                    onClick={handleVerifyMetadata}
                    disabled={verifyingMetadata}
                    className="shrink-0 rounded-md border border-[#8FA88A] px-4 py-2 text-xs font-semibold text-[#8FA88A] transition-colors hover:bg-[#8FA88A]/10 disabled:opacity-50"
                  >
                    {verifyingMetadata ? "Checking..." : "Verify"}
                  </button>
                </div>

                {metadataStatus && (
                  <div
                    className={`mt-4 rounded-md border p-3 ${
                      metadataStatus.matches
                        ? "border-green-700/50 bg-green-900/20"
                        : "border-red-700/50 bg-red-900/20"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        metadataStatus.matches
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {metadataStatus.matches
                        ? " Metadata is authentic and untampered"
                        : " Metadata has been modified"}
                    </p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-white/50">On-chain:</span>
                        <span className="font-mono text-white/70 truncate">
                          {metadataStatus.onChainHash.slice(0, 20)}...
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-white/50">Computed:</span>
                        <span className="font-mono text-white/70 truncate">
                          {metadataStatus.computedHash.slice(0, 20)}...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <a
                href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}?a=${result.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-[#8FA88A] hover:text-[#7A9776] transition-colors"
              >
                View on Etherscan →
              </a>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="mt-16 rounded-xl border border-[#4A5D48] bg-[#243329]/50 p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              How Verification Works
            </h3>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Enter your token ID",
                  desc: "Find it in your MetaMask wallet or the retailer's receipt.",
                },
                {
                  step: "2",
                  title: "We query the blockchain",
                  desc: "Fetch authenticity, status, and custodian directly from the smart contract.",
                },
                {
                  step: "3",
                  title: "Verify IPFS metadata",
                  desc: "Optionally compare the on-chain hash with the actual IPFS file.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8FA88A]/10 text-sm font-bold text-[#8FA88A]">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;