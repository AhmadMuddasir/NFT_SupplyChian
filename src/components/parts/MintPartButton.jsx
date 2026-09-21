"use client";

import React, { useState } from "react";
import { useContract } from "@/context/contractContext";
import { autopartApi } from "@/lib/api/autopartApi";
import toast from "react-hot-toast";

const MintPartButton = ({ partId, tokenURI, metadataHash, disabled = false, onSuccess }) => {
  // CHANGE: removed unused `tokenId` prop (never referenced in this component's logic)
  // CHANGE: added `disabled` prop, defaulting to false so existing callers aren't broken
  const [retailerAddress, setRetailerAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { mintToRetailer } = useContract();

  const handleMint = async (e) => {
    e.preventDefault();

    if (disabled) { // CHANGE: hard guard in case the form is somehow still submitted
      toast.error("This part is out of stock");
      return;
    }

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
      const { tokenId: newTokenId, receipt } = await mintToRetailer( // CHANGE: also grab `receipt` for transactionHash
        retailerAddress,
        tokenURI,
        metadataHash
      );

      if (newTokenId === null || newTokenId === undefined) {
        throw new Error("Token ID not found in receipt");
      }

      // CHANGE: was autopartApi.update(partId, { tokenId: newTokenId }) — that overwrote
      // the template's tokenId every mint instead of recording a new unit.
      await autopartApi.recordMintedUnit(partId, {
        tokenId: newTokenId,
        retailerAddress,
        transactionHash: receipt.hash,
      });

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
        disabled={disabled} // CHANGE: disable the initial "Mint to Retailer" button when out of stock
        className="w-full rounded-md bg-[#8FA88A] px-4 py-2.5 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed" // CHANGE: added disabled styling
      >
        {disabled ? "Out of Stock" : "Mint to Retailer"} {/* CHANGE: label swaps when disabled */}
      </button>
    );
  }

  // ...rest of the form (unchanged) — just make sure the submit button also respects `isMinting || disabled`:
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
          disabled={isMinting || disabled} // CHANGE: added `|| disabled`
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
