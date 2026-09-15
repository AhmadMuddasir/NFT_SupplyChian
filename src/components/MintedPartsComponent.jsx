"use client";

import { useEffect, useState, useMemo } from "react";
import { useContract } from "@/context/contractContext";

const PART_STATUSES = [
  "NEW",
  "RECALLED",
  "DEFECTIVE_RETURNED",
  "REPAIRED",
  "REFURBISHED",
];

const SALE_STATUSES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case "RECALLED":
      return "bg-red-900/50 text-red-400";
    case "DEFECTIVE_RETURNED":
      return "bg-orange-900/50 text-orange-400";
    case "REPAIRED":
    case "REFURBISHED":
      return "bg-blue-900/50 text-blue-400";
    default:
      return "bg-green-900/50 text-green-400";
  }
};

const getSaleBadgeStyle = (status) => {
  switch (status) {
    case "SOLD":
      return "bg-green-900/50 text-green-400";
    case "IN_TRANSIT":
      return "bg-yellow-900/50 text-yellow-400";
    case "RETURNED":
      return "bg-red-900/50 text-red-400";
    default:
      return "bg-white/10 text-white/60";
  }
};

export default function MintedPartsComponent({ parts = [], refreshing = false }) {
  const { verifyPartAuthenticity, getSaleStatus, getRetailerDetails } = useContract();

  const [enrichedParts, setEnrichedParts] = useState([]);
  const [loadingChainData, setLoadingChainData] = useState(false);

  const mintedParts = useMemo(() => {
    return parts.filter((p) => p.tokenId !== undefined && p.tokenId !== null);
  }, [parts]);

  useEffect(() => {
    if (!mintedParts.length) {
      setEnrichedParts([]);
      return;
    }

    let isMounted = true;

    const fetchOnChainDetails = async () => {
      setLoadingChainData(true);

      try {
        const results = await Promise.all(
          mintedParts.map(async (part) => {
            try {
              const [authData, saleStatusIdx] = await Promise.all([
                verifyPartAuthenticity(part.tokenId),
                getSaleStatus(part.tokenId),
              ]);

              const custodianAddr = authData[3];
              const retailerInfo = await getRetailerDetails(custodianAddr);

              return {
                ...part,
                onChain: {
                  isAuthentic: authData[0],
                  status: PART_STATUSES[Number(authData[1])],
                  metadataHash: authData[2],
                  custodian: custodianAddr,
                  mintedAt: new Date(Number(authData[4]) * 1000).toLocaleDateString(),
                  saleStatus: SALE_STATUSES[Number(saleStatusIdx)],
                  retailerName: retailerInfo.name,
                  retailerLocation: retailerInfo.location,
                  retailerApproved: retailerInfo.isApprove,
                },
              };
            } catch (err) {
              console.error(`Error fetching chain data for token ${part.tokenId}:`, err);
              return { ...part, onChain: null };
            }
          })
        );

        if (isMounted) {
          setEnrichedParts(results);
        }
      } catch (err) {
        console.error("Failed to sync on-chain parts:", err);
      } finally {
        if (isMounted) {
          setLoadingChainData(false);
        }
      }
    };

    fetchOnChainDetails();

    return () => {
      isMounted = false;
    };
  }, [mintedParts, verifyPartAuthenticity, getSaleStatus, getRetailerDetails]);

  if (refreshing) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#8FA88A] border-t-transparent" />
        <p className="mt-2 text-xs text-white/60">Loading parts...</p>
      </div>
    );
  }

  if (mintedParts.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
        <p className="text-xs text-white/60">
          No parts minted yet. Once a part is minted to a retailer it will appear here.
        </p>
      </div>
    );
  }

  const displayList = enrichedParts.length > 0 ? enrichedParts : mintedParts;

  return (
    <div className="space-y-3">
      {loadingChainData && (
        <p className="text-[11px] text-white/40 animate-pulse">
          Fetching latest on-chain state...
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {displayList.map((part) => (
          <div
            key={part._id || part.tokenId}
            className="flex flex-col justify-between rounded-lg border border-[#4A5D48] bg-[#243329] overflow-hidden hover:border-[#8FA88A]/50 transition-colors"
          >
            {/* Compact Image Box */}
            <div className="relative h-32 w-full bg-[#1C2620]/80 p-2 flex items-center justify-center">
              <img
                src={part.image?.url || part.thumbnail}
                alt={part.partName}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Compact Card Details */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <h3 className="text-sm font-medium text-white truncate leading-tight">
                    {part.partName}
                  </h3>
                  <span className="shrink-0 rounded-full bg-green-900/50 px-1.5 py-0.5 text-[10px] text-green-400">
                    Token ID: {part.tokenId}
                  </span>
                </div>

                <p className="text-xs text-white/60 truncate mt-0.5">
                  {part.brandName}
                </p>

                <p className="text-[11px] text-white/40 mt-1 truncate">
                  {part.category} · ${part.price} · Qty {part.quantity}
                </p>
              </div>

              {/* On-chain Details Container */}
              {part.onChain ? (
                <div className="border-t border-[#4A5D48]/70 pt-2 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeStyle(
                        part.onChain.status
                      )}`}
                    >
                      {part.onChain.status}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getSaleBadgeStyle(
                        part.onChain.saleStatus
                      )}`}
                    >
                      {part.onChain.saleStatus}
                    </span>
                    {!part.onChain.isAuthentic && (
                      <span className="rounded-full bg-red-900/50 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                        Recalled
                      </span>
                    )}
                  </div>

                  <div className="rounded-md bg-[#1C2620] border border-[#4A5D48]/60 p-2 leading-snug">
                    <p className="text-[10px] text-white/40 mb-0.5">Custodian</p>
                    {part.onChain.retailerName ? (
                      <div>
                        <p className="text-xs font-medium text-white truncate">
                          {part.onChain.retailerName}
                        </p>
                        <p className="text-[10px] text-white/60 truncate">
                          {part.onChain.retailerLocation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/60">Unregistered</p>
                    )}
                    <p className="text-[10px] text-white/40 mt-1 truncate font-mono">
                      {part.onChain.custodian}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-0.5">
                    <span className="truncate font-mono max-w-[60%]">
                      Hash: {part.onChain.metadataHash}
                    </span>
                    <span>{part.onChain.mintedAt}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-white/40 border-t border-[#4A5D48]/70 pt-2">
                  On-chain details unavailable.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}