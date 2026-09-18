"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";
import { RefreshCcwDotIcon } from "lucide-react";
import { RefreshCcw } from "lucide-react";

const STATUS_NAMES = [
  "NEW",
  "RECALLED",
  "DEFECTIVE_RETURNED",
  "REPAIRED",
  "REFURBISHED",
];

const SALE_STATUS_NAMES = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

const RetailerParts = () => {
  const { address, isConnected } = useAccount();
  const { contract, getSaleStatus, getNFTCustodian, verifyPartAuthenticity } =
    useContract();

  const [myParts, setMyParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | UNSOLD | IN_TRANSIT | SOLD | RETURNED

  const fetchMyParts = async () => {
    if (!contract || !address) return;

    try {
      setLoading(true);

      // 1. Get all parts from DB
      const result = await autopartApi.getAll({ limit: 100 });
      const allParts = result.data?.autoParts || [];

      // 2. Only keep parts that have been minted
      const minted = allParts.filter(
        (p) => p.tokenId !== undefined && p.tokenId !== null
      );

      // 3. Check ownership + enrich with blockchain data (in parallel)
      const enriched = await Promise.all(
        minted.map(async (part) => {
          try {
            const owner = await contract.ownerOf(part.tokenId);
            const isMine = owner.toLowerCase() === address.toLowerCase();

            if (!isMine) return null;

            const [saleStatus, custodian, authenticity] = await Promise.all([
              getSaleStatus(part.tokenId),
              getNFTCustodian(part.tokenId),
              verifyPartAuthenticity(part.tokenId),
            ]);

            return {
              ...part,
              owner,
              saleStatus: SALE_STATUS_NAMES[Number(saleStatus)],
              custodian,
              partStatus: STATUS_NAMES[Number(authenticity[1])],
              isAuthentic: authenticity[0],
            };
          } catch (err) {
            // Token may not exist or RPC hiccup — skip silently
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

  const visible =
    filter === "all"
      ? myParts
      : myParts.filter((p) => p.saleStatus === filter);

  const stats = {
    total: myParts.length,
    unsold: myParts.filter((p) => p.saleStatus === "UNSOLD").length,
    inTransit: myParts.filter((p) => p.saleStatus === "IN_TRANSIT").length,
    sold: myParts.filter((p) => p.saleStatus === "SOLD").length,
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
          <p className="text-xs text-white/50 mt-1">
            All NFTs currently held by your wallet
          </p>
        </div>
        <button
          onClick={fetchMyParts}
          className="self-start rounded-md border border-[#4A5D48] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
        >
          <RefreshCcw/>
        </button>
      </div>

      {/* Stats Row */}
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
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {stats.inTransit}
          </p>
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

      {visible.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
          <p className="text-white/60">
            {myParts.length === 0
              ? "You don't own any parts yet."
              : `No parts with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((part) => (
            <div
              key={part._id}
              className="rounded-xl border border-[#4A5D48] bg-[#243329] overflow-hidden hover:border-[#8FA88A]/50 transition-colors"
            >
              {/* Image */}
              <img
                src={part.image?.url || part.thumbnail}
                alt={part.partName}
                className="h-40 w-full object-cover"
              />

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white line-clamp-1">
                    {part.partName}
                  </h3>
                  <span className="shrink-0 rounded-full bg-[#8FA88A]/10 px-2 py-0.5 text-xs text-[#8FA88A]">
                    Token Id: {part.tokenId}
                  </span>
                </div>

                <p className="text-sm text-white/60 mt-1">{part.brandName}</p>

                {part.description && (
                  <p className="text-xs text-white/40 mt-2 line-clamp-2">
                    {part.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getSaleStatusStyle(
                      part.saleStatus
                    )}`}
                  >
                    {part.saleStatus}
                  </span>
                  <span className="rounded-full border border-[#4A5D48] bg-white/5 px-2 py-0.5 text-xs text-white/60">
                    {part.partStatus}
                  </span>
                  {!part.isAuthentic && (
                    <span className="rounded-full border border-red-700/50 bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                      Recalled
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#4A5D48] pt-3">
                  <span className="text-xs text-white/50">
                    {part.category}
                  </span>
                  <span className="text-sm font-semibold text-[#8FA88A]">
                    ${part.price}
                  </span>
                </div>

+                {part.updatedAt && (
                  <p className="text-xs text-white/30 mt-2">
                    Last updated:{" "}
                    {new Date(part.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RetailerParts;