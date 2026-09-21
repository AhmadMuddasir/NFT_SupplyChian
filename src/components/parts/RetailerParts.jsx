"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";
import { RefreshCcw, ChevronDown } from "lucide-react"; // CHANGE: added ChevronDown for expand indicator

const STATUS_NAMES = ["NEW", "RECALLED", "DEFECTIVE_RETURNED", "REPAIRED", "REFURBISHED"];
const SALE_STATUS_NAMES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const RetailerParts = () => {
  const { address, isConnected } = useAccount();
  const { contract, getSaleStatus, getNFTCustodian, verifyPartAuthenticity } = useContract();

  const [myParts, setMyParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null); // CHANGE: replaces modal — tracks which card is expanded

  const fetchMyParts = async () => {
    if (!contract || !address) return;

    try {
      setLoading(true);

      // CHANGE: source candidate list from MintedUnit (per-retailer), not from AutoPart templates.
      // AutoPart no longer carries a single tokenId, so filtering templates by tokenId is wrong now.
      const result = await autopartApi.getUnitsForRetailer(address);
      const units = result.data?.units || [];

      // Still verify live on-chain ownership — a unit initially minted to this retailer may have
      // since been transferred/returned, so DB record alone isn't authoritative for "do I own it now"
      const enriched = await Promise.all(
        units.map(async (unit) => {
          try {
            const owner = await contract.ownerOf(unit.tokenId);
            const isMine = owner.toLowerCase() === address.toLowerCase();
            if (!isMine) return null;

            const [saleStatus, custodian, authenticity] = await Promise.all([
              getSaleStatus(unit.tokenId),
              getNFTCustodian(unit.tokenId),
              verifyPartAuthenticity(unit.tokenId),
            ]);

            return {
              ...unit,
              part: unit.autoPart || {}, // CHANGE: template fields now nested under unit.autoPart
              owner,
              saleStatus: SALE_STATUS_NAMES[Number(saleStatus)],
              custodian,
              partStatus: STATUS_NAMES[Number(authenticity[1])],
              isAuthentic: authenticity[0],
            };
          } catch {
            return null;
          }
        })
      );

      setMyParts(enriched.filter(Boolean));
    } catch (error) {
      console.error("Failed to load retailer parts:", error);
      toast.error("Failed to load your parts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address && contract) {
      fetchMyParts();
    }
  }, [isConnected, address, contract]);

  const visible = filter === "all" ? myParts : myParts.filter((p) => p.saleStatus === filter);

  const stats = {
    total: myParts.length,
    unsold: myParts.filter((p) => p.saleStatus === "UNSOLD").length,
    inTransit: myParts.filter((p) => p.saleStatus === "IN_TRANSIT").length,
    sold: myParts.filter((p) => p.saleStatus === "SOLD").length,
  };

  const getSaleStatusStyle = (status) => {
    switch (status) {
      case "UNSOLD": return "bg-blue-900/40 border-blue-700/50 text-blue-400";
      case "IN_TRANSIT": return "bg-yellow-900/40 border-yellow-700/50 text-yellow-400";
      case "SOLD": return "bg-green-900/40 border-green-700/50 text-green-400";
      case "RETURNED": return "bg-red-900/40 border-red-700/50 text-red-400";
      default: return "bg-white/5 border-white/20 text-white/60";
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-white/60">Please connect your wallet to view your parts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
        <p className="mt-4 text-white/60">Loading your inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">My Inventory</h2>
          <p className="text-xs text-white/50 mt-1">All NFTs currently held by your wallet</p>
        </div>
        <button
          onClick={fetchMyParts}
          className="self-start rounded-md border border-[#4A5D48] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-3">
          <p className="text-xs text-white/50">Total</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-3">
          <p className="text-xs text-white/50">Unsold</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.unsold}</p>
        </div>
        <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-3">
          <p className="text-xs text-white/50">In Transit</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.inTransit}</p>
        </div>
        <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-3">
          <p className="text-xs text-white/50">Sold</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.sold}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "border-[#8FA88A] bg-[#8FA88A]/10 text-[#8FA88A]"
                : "border-[#4A5D48] text-white/50 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* CHANGE: replaced grid-of-cards-with-modal with a vertical list of expandable rows */}
      {visible.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
          <p className="text-white/60">
            {myParts.length === 0 ? "You don't own any parts yet." : `No parts with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((unit) => {
            const part = unit.part;
            const isExpanded = expandedId === unit._id;

            return (
              <div
                key={unit._id}
                className="rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden hover:border-[#8FA88A]/50 transition-colors"
              >
                {/* CHANGE: compact row header — click toggles expansion, no modal */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : unit._id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{part.partName}</h3>
                      <span className="shrink-0 rounded-full bg-[#8FA88A]/10 px-2 py-0.5 text-xs text-[#8FA88A]">
                        Token #{unit.tokenId}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5 truncate">{part.brandName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSaleStatusStyle(unit.saleStatus)}`}>
                        {unit.saleStatus}
                      </span>
                      <span className="rounded-full border border-[#4A5D48] bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
                        {unit.partStatus}
                      </span>
                      {!unit.isAuthentic && (
                        <span className="rounded-full border border-red-700/50 bg-red-900/30 px-2 py-0.5 text-[11px] text-red-400">
                          Recalled
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* CHANGE: extends downward inline instead of opening a modal */}
                {isExpanded && (
                  <div className="border-t border-[#4A5D48] p-4 flex flex-col sm:flex-row gap-4">
                    <img
                      src={part.image?.url || part.thumbnail}
                      alt={part.partName}
                      className="h-32 w-32 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      {part.description && (
                        <p className="text-xs text-white/60">{part.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">{part.category}</span>
                        <span className="font-semibold text-[#8FA88A]">${part.price}</span>
                      </div>
                      <p className="text-xs text-white/40 truncate">Owner: {unit.owner}</p>
                      <p className="text-xs text-white/40 truncate">Custodian: {unit.custodian}</p>
                      {unit.transactionHash && (
                        <p className="text-xs text-white/40 truncate">Tx: {unit.transactionHash}</p>
                      )}
                      {unit.updatedAt && (
                        <p className="text-xs text-white/30">
                          Last updated: {new Date(unit.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RetailerParts;