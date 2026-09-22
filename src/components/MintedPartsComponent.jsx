"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import { ChevronDown } from "lucide-react";

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
    case "RECALLED": return "bg-red-900/50 text-red-400";
    case "DEFECTIVE_RETURNED": return "bg-orange-900/50 text-orange-400";
    case "REPAIRED":
    case "REFURBISHED": return "bg-blue-900/50 text-blue-400";
    default: return "bg-green-900/50 text-green-400";
  }
};

const getSaleBadgeStyle = (status) => {
  switch (status) {
    case "SOLD": return "bg-green-900/50 text-green-400";
    case "IN_TRANSIT": return "bg-yellow-900/50 text-yellow-400";
    case "RETURNED": return "bg-red-900/50 text-red-400";
    default: return "bg-white/10 text-white/60";
  }
};

export default function MintedPartsComponent({ refreshing = false, refreshTrigger = 0 }) {
  const { address } = useAccount();
  const { verifyPartAuthenticity, getSaleStatus, getRetailerDetails, contract } = useContract();

  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [enrichedUnits, setEnrichedUnits] = useState([]);
  const [loadingChainData, setLoadingChainData] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // CHANGE: tracks which row is expanded

  useEffect(() => {
    if (!address) return;
    let isMounted = true;

    const fetchUnits = async () => {
      setLoadingUnits(true);
      try {
        const result = await autopartApi.getAllUnitsForManufacturer(address);
        if (isMounted) setUnits(result.data?.units || []);
      } catch (err) {
        console.error("Failed to fetch minted units:", err);
      } finally {
        if (isMounted) setLoadingUnits(false);
      }
    };

    fetchUnits();
    return () => { isMounted = false; };
  }, [address, refreshTrigger]); 

  useEffect(() => {
    if (!units.length) { setEnrichedUnits([]); return; }
    let isMounted = true;

    const fetchOnChainDetails = async () => {
      setLoadingChainData(true);
      try {
        const results = await Promise.all(
          units.map(async (unit) => {
            try {
              const [authData, saleStatusIdx] = await Promise.all([
                verifyPartAuthenticity(unit.tokenId),
                getSaleStatus(unit.tokenId),
              ]);

              const custodianAddr = authData[3];


              const [retailerInfo, minterInfo] = await Promise.all([
                getRetailerDetails(custodianAddr),
                getRetailerDetails(unit.mintedBy || ""),
              ]);
              console.log("retailerInfo",retailerInfo)

              let currentOwner = custodianAddr;
              try {
                currentOwner = await contract.ownerOf(unit.tokenId);
              } catch (_) {}

              return {
                ...unit,
                onChain: {
                  isAuthentic: authData[0],
                  status: PART_STATUSES[Number(authData[1])],
                  metadataHash: authData[2],
                  custodian: custodianAddr,
                  currentOwner,
                  mintedAt: new Date(Number(authData[4]) * 1000).toLocaleDateString(),
                  saleStatus: SALE_STATUSES[Number(saleStatusIdx)],
                  // CHANGE: "To" info — current custodian/retailer
                  retailerName: retailerInfo?.name || "",
                  retailerLocation: retailerInfo?.location || "",
                  // CHANGE: "From" info — manufacturer who minted it
                  minterAddress: unit.mintedBy || address,
                },
              };
            } catch (err) {
              console.error(`Error fetching chain data for token ${unit.tokenId}:`, err);
              return { ...unit, onChain: null };
            }
          })
        );
        if (isMounted) setEnrichedUnits(results);
        console.log(results)
      } catch (err) {
        console.error("Failed to sync on-chain parts:", err);
      } finally {
        if (isMounted) setLoadingChainData(false);
      }
    };

    fetchOnChainDetails();
    return () => { isMounted = false; };
  }, [units, verifyPartAuthenticity, getSaleStatus, getRetailerDetails, contract, address]);

  if (refreshing || loadingUnits) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#8FA88A] border-t-transparent" />
        <p className="mt-2 text-xs text-white/60">Loading minted parts...</p>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
        <p className="text-xs text-white/60">
          No parts minted yet. Once a part is minted to a retailer it will appear here.
        </p>
      </div>
    );
  }

  const displayList = enrichedUnits.length > 0 ? enrichedUnits : units;

  return (
    <div className="space-y-3">
      {loadingChainData && (
        <p className="text-[11px] text-white/40 animate-pulse">
          Fetching latest on-chain state...
        </p>
      )}

      {/* CHANGE: switched from grid cards to expandable list rows */}
      <div className="space-y-2">
        {displayList.map((unit) => {
          const part = unit.autoPart || {};
          const isExpanded = expandedId === unit._id;

          return (
            <div
              key={unit._id || unit.tokenId}
              className="rounded-lg border border-[#4A5D48] bg-[#243329] overflow-hidden hover:border-[#8FA88A]/50 transition-colors"
            >
              {/* CHANGE: compact row — click to expand, no modal */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : unit._id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                {/* Small thumbnail in the row */}
                <img
                  src={part.image?.url || part.thumbnail}
                  alt={part.partName}
                  className="h-10 w-10 rounded object-cover shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">
                      {part.partName}
                    </span>
                    {/* CHANGE: token id badge */}
                    <span className="shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] text-green-400">
                      Token #{unit.tokenId}
                    </span>
                  </div>

                  {/* CHANGE: from/to summary visible in the collapsed row */}
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-white/50 flex-wrap">
                    <span className="font-mono truncate max-w-[120px]">
                      From: {unit.onChain?.minterAddress
                        ? `${unit.onChain.minterAddress.slice(0, 6)}...${unit.onChain.minterAddress.slice(-4)}`
                        : (unit.mintedBy
                          ? `${unit.mintedBy.slice(0, 6)}...${unit.mintedBy.slice(-4)}`
                          : "Manufacturer")}
                    </span>
                    <span className="text-white/30">→</span>
                    <span className="truncate max-w-[120px]">
                      To: {unit.onChain?.retailerName || unit.retailerAddress
                        ? (unit.onChain?.retailerName || `${unit.retailerAddress?.slice(0, 6)}...${unit.retailerAddress?.slice(-4)}`)
                        : "Retailer"}
                    </span>
                  </div>
                </div>

                {/* Status badges visible in collapsed row */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {unit.onChain && (
                    <>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeStyle(unit.onChain.status)}`}>
                        {unit.onChain.status}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getSaleBadgeStyle(unit.onChain.saleStatus)}`}>
                        {unit.onChain.saleStatus}
                      </span>
                    </>
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={`shrink-0 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {/* CHANGE: expanded detail panel — extends inline below the row */}
              {isExpanded && (
                <div className="border-t border-[#4A5D48] p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Larger image in expanded view */}
                    <img
                      src={part.image?.url || part.thumbnail}
                      alt={part.partName}
                      className="h-32 w-32 rounded-lg object-cover shrink-0"
                    />

                    <div className="min-w-0 flex-1 space-y-3">
                      {/* Part info */}
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Part Info</p>
                        <p className="text-sm font-semibold text-white">{part.partName}</p>
                        <p className="text-xs text-white/60">{part.brandName} · {part.category}</p>
                        <p className="text-xs text-white/50">${part.price}</p>
                        {part.description && (
                          <p className="text-xs text-white/40 mt-1">{part.description}</p>
                        )}
                      </div>

                      {/* CHANGE: From / To transfer info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-md bg-[#1C2620] border border-[#4A5D48]/60 p-3">
                          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">From (Manufacturer)</p>
                          <p className="text-xs font-medium text-white">
                            {unit.onChain?.minterAddress
                              ? `${unit.onChain.minterAddress.slice(0, 8)}...${unit.onChain.minterAddress.slice(-6)}`
                              : address}
                          </p>
                          {unit.mintedBy && (
                            <p className="text-[10px] text-white/40 font-mono mt-0.5 truncate">{unit.mintedBy}</p>
                          )}
                          <p className="text-[10px] text-white/30 mt-1">
                            Minted: {unit.onChain?.mintedAt || new Date(unit.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="rounded-md bg-[#1C2620] border border-[#4A5D48]/60 p-3">
                          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">To (Retailer)</p>
                          {unit.onChain?.retailerName ? (
                            <>
                              <p className="text-xs font-medium text-white">{unit.onChain.retailerName}</p>
                              <p className="text-[10px] text-white/60">{unit.onChain.retailerLocation}</p>
                            </>
                          ) : (
                            <p className="text-xs text-white/60">Unregistered</p>
                          )}
                          <p className="text-[10px] text-white/40 font-mono mt-1 truncate">
                            {unit.retailerAddress || unit.onChain?.custodian}
                          </p>
                        </div>
                      </div>

                      {/* On-chain status */}
                      {unit.onChain && (
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">On-chain Status</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeStyle(unit.onChain.status)}`}>
                              {unit.onChain.status}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getSaleBadgeStyle(unit.onChain.saleStatus)}`}>
                              {unit.onChain.saleStatus}
                            </span>
                            {!unit.onChain.isAuthentic && (
                              <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                Recalled
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/30 font-mono mt-2 truncate">
                            Metadata hash: {unit.onChain.metadataHash}
                          </p>
                        </div>
                      )}

                      {/* Tx hash */}
                      {unit.transactionHash && (
                        <p className="text-[10px] text-white/30 font-mono truncate">
                          Tx: {unit.transactionHash}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}