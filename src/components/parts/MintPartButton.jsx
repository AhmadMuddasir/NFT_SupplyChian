"use client";

import React, { useState } from "react";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";

const MintPartButton = ({ partId, tokenId, tokenURI, metadataHash, onSuccess }) => {
  const [retailerAddress, setRetailerAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { mintToRetailer } = useContract();

  const handleMint = async (e) => {
    e.preventDefault();

    if (!tokenURI || !metadataHash) {
      toast.error("tokenURI or metadataHash missing");
      return;
    }

    if (!retailerAddress) {
      toast.error("Retailer address is required");
      return;
    }

    setIsMinting(true);
    const toastId = toast.loading("Minting part to retailer...");

    try {
      // 1️⃣ Mint on blockchain → get tokenId
      const { tokenId: newTokenId } = await mintToRetailer(
        retailerAddress,
        tokenURI,
        metadataHash
      );

      if (newTokenId === null || newTokenId === undefined) {
        throw new Error("Token ID not found in receipt");
      }

      // 2️⃣ PATCH tokenId to database
      await autopartApi.update(partId, { tokenId: newTokenId });

      toast.success(` Minted! Token #${newTokenId}`, { id: toastId });
      setRetailerAddress("");
      setShowInput(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);

      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        toast.error("Transaction rejected by user", { id: toastId });
        return;
      }

      toast.error(
        error?.response?.data?.message || error.message || "Failed to mint part",
        { id: toastId }
      );

      setRetailerAddress("");
      setShowInput(false);
      onSuccess?.();
    } finally {
      setIsMinting(false);
    }
  };



  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="w-full rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
      >
        Mint to Retailer
      </button>
    );
  }

  return (
    <form onSubmit={handleMint} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Retailer Wallet Address
        </label>
        <input
          type="text"
          value={retailerAddress}
          onChange={(e) => setRetailerAddress(e.target.value)}
          placeholder="0x..."
          required
          className="w-full rounded-md border border-[#4A5D48] bg-[#1C2620] px-4 py-2 text-sm text-white placeholder-white/30 focus:border-[#8FA88A] focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isMinting}
          className="flex-1 rounded-md bg-[#8FA88A] px-4 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isMinting ? "Minting..." : "Confirm Mint"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowInput(false);
            setRetailerAddress("");
          }}
          className="rounded-md border border-[#4A5D48] px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-[#4A5D48]/20 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default MintPartButton;