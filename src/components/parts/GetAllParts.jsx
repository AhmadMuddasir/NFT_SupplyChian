"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { autopartApi } from "@/lib/api/autopartApi";
import { useContract } from "@/context/contractContext";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";

const GetAllParts = ({ allowRequest = false }) => {
  const { address } = useAccount();
  const { createSupplyRequest } = useContract();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [requesting, setRequesting] = useState(false);

  // ========== FETCH ALL PARTS ==========
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        const result = await autopartApi.getAll({ limit: 50 });
        setParts(result.data?.autoParts || []);
      } catch (error) {
        console.error("Failed to fetch parts:", error);
        toast.error("Failed to load parts");
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, []);

  // ========== CREATE SUPPLY REQUEST ==========
  const handleRequest = async () => {
    if (!selectedPart) return;

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (quantity < 1 || quantity > 100) {
      toast.error("Quantity must be between 1 and 100");
      return;
    }

    setRequesting(true);
    const toastId = toast.loading("Creating supply request...");

    try {
      
      const productHash = ethers.id(selectedPart.partName);

      await createSupplyRequest(productHash, Number(quantity));

      toast.success(
        `Request for ${selectedPart.partName} (Qty: ${quantity}) submitted!`,
        { id: toastId }
      );

      setSelectedPart(null);
      setQuantity(1);
    } catch (error) {
      console.error("Error:", error);

      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        toast.error("Transaction rejected by user", { id: toastId });
        return;
      }

      toast.error(
        error?.reason || error?.message || "Failed to create request",
        { id: toastId }
      );
    } finally {
      setRequesting(false);
    }
  };

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
        <p className="mt-4 text-white/60">Loading parts...</p>
      </div>
    );
  }

  // ========== EMPTY ==========
  if (parts.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
        <p className="text-white/60">No parts available yet.</p>
      </div>
    );
  }

  // ========== PARTS GRID ==========
  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Available Parts</h2>
          <p className="text-xs text-white/50 mt-1">
            {parts.length} part(s) available for supply request
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {parts.map((part) => (
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

            {/* Details */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-white line-clamp-1">
                  {part.partName}
                </h3>
                <span className="shrink-0 rounded-full bg-[#8FA88A]/10 px-2 py-0.5 text-xs text-[#8FA88A]">
                  {part.category}
                </span>
              </div>

              <p className="text-sm text-white/60 mt-1">{part.brandName}</p>

              {part.description && (
                <p className="text-xs text-white/40 mt-2 line-clamp-2">
                  {part.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-[#4A5D48] pt-3">
                <span className="text-sm font-semibold text-[#8FA88A]">
                  ${part.price}
                </span>
                <span className="text-xs text-white/40">
                  Qty: {part.quantity}
                </span>
              </div>

              {allowRequest && (
                <button
                  onClick={() => {
                    setSelectedPart(part);
                    setQuantity(1);
                  }}
                  className="mt-3 w-full rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
                >
                  Request Supply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ========== QUANTITY MODAL ========== */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-lg border border-[#4A5D48] bg-[#1C2620] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Request Supply
              </h3>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Part Preview */}
            <div className="flex items-center gap-3 rounded-md border border-[#4A5D48] bg-[#243329] p-3 mb-4">
              <img
                src={selectedPart.image?.url || selectedPart.thumbnail}
                alt={selectedPart.partName}
                className="h-12 w-12 rounded object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {selectedPart.partName}
                </p>
                <p className="text-xs text-white/50 truncate">
                  {selectedPart.brandName}
                </p>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Quantity (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border border-[#4A5D48] bg-[#243329] px-4 py-2 text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none"
                placeholder="1"
              />
            </div>

            {/* Info */}
            <div className="mt-4 rounded-md bg-[#8FA88A]/10 p-3">
              <p className="text-xs text-[#8FA88A]">
                 Your request will be sent to manufacturers. Once approved,
                they will mint NFTs for you.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="flex-1 rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? "Submitting..." : "Submit Request"}
              </button>
              <button
                onClick={() => setSelectedPart(null)}
                disabled={requesting}
                className="rounded-md border border-[#4A5D48] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-[#4A5D48]/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GetAllParts;