"use client";

import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import ManufactureCard from "@/components/ManufactureCard";
import MintPartButton from "@/components/parts/MintPartButton";
import CreatePartModal from "@/components/modals/CreatePartModals";
import toast from "react-hot-toast";
import { autopartApi } from "@/lib/api/autopartApi";
import RequestComponent from "@/components/RequestComponent";
import AllRetailers from "@/components/AllRetailers";
import MintedPartsComponent from "@/components/MintedPartsComponent";
import ManufacturerParts from "@/components/parts/ManufacturerParts";

const Page = () => {
  const { address, isConnected } = useAccount();

  const {
    joinAsManufacturer,
    AddRetailerDirectly,
    removeRetailer,
    repairPart,
    refurbishedPart,
    recallPart,
    transferToRetailer,
    getAllManufacturers,
    contract,
    fullfillSupplyRequest,
    getAllSupplyRequests,
    getRetailerRequests,
    addRetailer,
  } = useContract();

  const [manufacturers, setManufacturers] = useState([]);
  const [parts, setParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [isModelOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("actions");

  const [supplyRequests, setSupplyRequests] = useState([]);
  const [retailerRequests, setRetailerRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (!contract) return;
    const fetchManufacturers = async () => {
      try {
        const manuf = await getAllManufacturers();
        setManufacturers(manuf);
      } catch (err) {
        console.error("Error fetching manufacturers:", err);
      }
    };

    fetchManufacturers();
  }, [contract]);

  const fetchParts = async () => {
    if (!address) return;
    try {
      setLoadingParts(true);
      const result = await autopartApi.getAll({ limit: 30 });
      const fetchedParts = result.data?.autoParts || [];
      const myParts = fetchedParts.filter(
        (part) =>
          part.createdBy?.address?.toLowerCase() === address?.toLowerCase(),
      );

      setParts(myParts);
    } catch (error) {
      console.error("Failed to fetch parts:", error);
      toast.error("Failed to load parts");
    } finally {
      setLoadingParts(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchParts();
    }
  }, [isConnected, address]);

  const fetchRequests = async () => {
    if (!contract) return;
    try {
      setLoadingRequests(true);
      const [retailerReqs, supplyReqs] = await Promise.all([
        getRetailerRequests(),
        getAllSupplyRequests(),
      ]);
      setRetailerRequests(retailerReqs);
      setSupplyRequests(supplyReqs);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (contract && activeTab === "requests") {
      fetchRequests();
    }
  }, [contract, activeTab]);

  const handleApproveRetailer = async (retailerAddress) => {
    await addRetailer(retailerAddress);
    await fetchRequests();
  };

  const handleFulfillSupply = async (requestId, uris, hashes) => {
    await fullfillSupplyRequest(requestId, uris, hashes);
    await fetchRequests();
  };

  const pendingRetailerCount = retailerRequests.length;
  const pendingSupplyCount = supplyRequests.filter((r) => !r.fulfilled).length;
  const totalPendingRequests = pendingRetailerCount + pendingSupplyCount;

  const mintedPartsCount = parts.filter(
    (p) => p.tokenId !== undefined && p.tokenId !== null,
  ).length;

  const actions = [
    {
      title: "Join as Manufacturer",
      description: "Register your company(Note:i am giving access to everyone to try).",
      fields: [
        { name: "name", placeholder: "Company name" },
        { name: "location", placeholder: "Location" },
      ],
      onSubmit: (value) => joinAsManufacturer(value.name, value.location),
    },
    {
      title: "Add Retailer(Note:first join as Manufacturer)",
      description: "Grant a retailer access to your supply chain.",
      fields: [
        { name: "retailerAddress", placeholder: "Retailer Address" },
        { name: "name", placeholder: "Company name" },
        { name: "location", placeholder: "Location" },
      ],
      onSubmit: (v) =>
        AddRetailerDirectly(v.retailerAddress, v.name, v.location),
    },
    {
      title: "Remove Retailer",
      description: "Revoke a retailer's access.",
      fields: [{ name: "retailer", placeholder: "Retailer Wallet Address" }],
      onSubmit: (v) => removeRetailer(v.retailer),
    },
    {
      title: "Repair Part",
      description: "Mark a defective part as repaired.",
      fields: [{ name: "tokenId", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => repairPart(v.tokenId),
    },
    {
      title: "Refurbished Part",
      description: "Mark a defective part as refurbished.",
      fields: [{ name: "tokenId", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => refurbishedPart(v.tokenId),
    },
    {
      title: "Recall Part",
      description: "Issue a recall on a specific part.",
      fields: [{ name: "tokenId", type: "number", placeholder: "TokenId" }],
      onSubmit: (v) => recallPart(v.tokenId),
    },
    {
      title: "Transfer to Retailer",
      description: "Directly transfer a part to a retailer.",
      fields: [
        { name: "to", placeholder: "Retailer address" },
        { name: "tokenId", type: "number", placeholder: "Token ID" },
      ],
      onSubmit: (v) => transferToRetailer(v.to, v.tokenId),
    },
  ];

  return (
    <div className="min-h-screen bg-[#1C2620] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#4A5D48] bg-[#8FA88A]/10 px-4 py-1.5 text-sm font-medium text-[#8FA88A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8FA88A]" />
              Manufacturer Dashboard
            </span>
            <h1 className="mt-4 text-2xl font-bold text-white">
              Mint off chain part to retailer as NFT
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Manage your parts, retailers, and recalls.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-[#8FA88A] px-6 py-3 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776]"
          >
            + Create New Part
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-[#4A5D48]">
          <button
            onClick={() => setActiveTab("actions")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "actions"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Actions
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "requests"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Requests
            {totalPendingRequests > 0 && (
              <span className="rounded-full bg-[#8FA88A] px-2 py-0.5 text-xs font-semibold text-[#1C2620]">
                {totalPendingRequests}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("parts")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "parts"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            My Parts ({parts.length})
          </button>
          <button
            onClick={() => setActiveTab("minted")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "minted"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Minted Parts ({mintedPartsCount})
          </button>
          <button
            onClick={() => setActiveTab("retailers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "retailers"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            All Retailers
          </button>
        </div>

        {activeTab === "actions" && (
          <div className="mt-6 space-y-3">
            {actions.map((action, i) => (
              <div key={i}>
                <ManufactureCard key={action.title} {...action} />
              </div>
            ))}
            <div className="mt-4 p-2 font-bold text-2xl flex center">
              <h1>Manufacturers List - </h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {manufacturers.map((m) => (
                <div
                  key={m.address}
                  className="rounded-lg border border-[#4A5D48] bg-[#1C2620] p-4 text-white"
                >
                  <p className="text-sm text-white/60 truncate m-1 p-1">
                    address: {m.address}
                  </p>
                  <p className="text-sm font-semibold m-1 p-1">
                    Manufacturer Name: {m.name}
                  </p>
                  <p className="text-white/80 m-1 p-1">
                    Location: {m.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <RequestComponent
            parts = {parts}
            retailerRequests={retailerRequests}
            supplyRequests={supplyRequests}
            onApproveRetailer={handleApproveRetailer}
            onFulfillSupply={handleFulfillSupply}
            refreshing={loadingRequests}
          />
        )}

        {activeTab === "parts" && (
          <ManufacturerParts
            loadingParts={loadingParts}
            parts={parts}
            onOpenModal={() => setIsModalOpen(true)}
            onSuccess={fetchParts}
          />
        )}

        {activeTab === "minted" && (
          <div className="mt-6">
            <MintedPartsComponent parts={parts} refreshing={loadingParts} />
          </div>
        )}

        {activeTab === "retailers" && (
          <div>
            <AllRetailers retailerRequests={retailerRequests} />
          </div>
        )}
      </div>

      <CreatePartModal
        isOpen={isModelOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchParts}
      />
    </div>
  );
};

export default Page;