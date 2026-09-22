"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

export default function ReturnedParts() {
  const { address } = useAccount();
  const { contract, repairPart, refurbishedPart, verifyPartAuthenticity } = useContract();

  const [returnedUnits, setReturnedUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });

  const fetchReturnedParts = async () => {
    if (!contract || !address) return;
    setLoading(true);

    try {
      const result = await autopartApi.getAllUnitsForManufacturer(address);
      const units = result.data?.units || [];


      const checked = await Promise.all(
        units.map(async (unit) => {
          try {
            const authData = await verifyPartAuthenticity(unit.tokenId);
            const statusIndex = Number(authData[1]);
            if (statusIndex !== 2) return null;

            const owner = await contract.ownerOf(unit.tokenId);
            if (owner.toLowerCase() !== address.toLowerCase()) return null;

            return {
              ...unit,
              part: unit.autoPart || {},
              onChain: {
                status: "DEFECTIVE_RETURNED",
                metadataHash: authData[2],
                custodian: authData[3],
                mintedAt: new Date(Number(authData[4]) * 1000).toLocaleDateString(),
              },
            };
          } catch {
            return null;
          }
        })
      );

      setReturnedUnits(checked.filter(Boolean));
    } catch (err) {
      console.error("Failed to fetch returned parts:", err);
      toast.error("Failed to load returned parts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && address) {
      fetchReturnedParts();
    }
  }, [contract, address]);

  const handleRepair = async (tokenId) => {
    setActionLoading({ id: tokenId, type: "repair" });
    const toastId = toast.loading("Confirm repair in wallet...");
    try {
      await repairPart(tokenId);
      toast.success(`Token #${tokenId} marked as repaired`, { id: toastId });
      setReturnedUnits((prev) => prev.filter((u) => u.tokenId !== tokenId));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Repair failed", { id: toastId });
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleRefurbish = async (tokenId) => {
    setActionLoading({ id: tokenId, type: "refurbish" });
    const toastId = toast.loading("Confirm refurbish in wallet...");
    try {
      await refurbishedPart(tokenId);
      toast.success(`Token #${tokenId} marked as refurbished`, { id: toastId });
      setReturnedUnits((prev) => prev.filter((u) => u.tokenId !== tokenId));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Refurbish failed", { id: toastId });
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
        <p className="mt-4 text-white/60 text-sm">Checking for returned parts...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Returned Parts</h2>
          <p className="text-xs text-white/50 mt-0.5">
            Parts returned by retailers as defective — repair or refurbish to restock
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[#4A5D48] bg-orange-900/20 px-3 py-0.5 text-xs text-orange-400">
            {returnedUnits.length} returned
          </span>
          <button
            onClick={fetchReturnedParts}
            className="rounded-md border border-[#4A5D48] p-2 text-white/60 hover:bg-[#4A5D48]/20 hover:text-white transition-colors"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {returnedUnits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50 py-12 text-center">
          <p className="text-sm text-white/50">No defective returns at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returnedUnits.map((unit) => {
            const part = unit.part;
            const isActing = actionLoading.id === unit.tokenId;

            return (
              <div
                key={unit._id || unit.tokenId}
                className="rounded-lg border border-orange-800/40 bg-[#243329] p-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <img
                    src={part.image?.url || part.thumbnail}
                    alt={part.partName}
                    className="h-20 w-20 rounded-lg object-cover shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-white">{part.partName}</p>
                        <p className="text-xs text-white/60">{part.brandName} · {part.category}</p>
                      </div>
                      <span className="rounded-full bg-orange-900/40 border border-orange-700/50 px-2 py-0.5 text-xs text-orange-400">
                        Token #{unit.tokenId}
                      </span>
                    </div>

                    <div className="mt-2 rounded-md bg-[#1C2620] border border-[#4A5D48]/60 p-2">
                      <p className="text-[10px] text-white/40 mb-0.5">Returned from</p>
                      <p className="text-xs text-white/70 font-mono truncate">
                        {unit.retailerAddress || unit.onChain?.custodian || "Unknown retailer"}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        Originally minted: {unit.onChain?.mintedAt}
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleRepair(unit.tokenId)}
                        disabled={isActing}
                        className="flex-1 rounded-md bg-green-700/80 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isActing && actionLoading.type === "repair"
                          ? "Repairing..."
                          : "Mark as Repaired"}
                      </button>
                      <button
                        onClick={() => handleRefurbish(unit.tokenId)}
                        disabled={isActing}
                        className="flex-1 rounded-md bg-green-700/80 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isActing && actionLoading.type === "refurbish"
                          ? "Refurbishing..."
                          : "Mark as Refurbished"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}