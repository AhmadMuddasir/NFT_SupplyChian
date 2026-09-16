"use client";

import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useContract } from "@/context/contractContext";
import ManufactureCard from "@/components/ManufactureCard";
import toast from "react-hot-toast";
import GetAllParts from "@/components/parts/GetAllParts";
import RetailerParts from "@/components/parts/RetailerParts";

const Page = () => {
  const { address, isConnected } = useAccount();

  const {
    contract,
    requestForRetailer,
    getRetailerStatus,
    createSupplyRequest,
    shipPart,
    confirmDelivery,
    reportDefectiveReturn,
    getAllSupplyRequests,
    verifyPartAuthenticity,
    getSaleStatus,
    getNFTCustodian,
    getCustomerPhoneNumber,
  } = useContract();

  const [activeTab, setActiveTab] = useState("actions");

  const [status, setStatus] = useState({
    isRetailer: false,
    isPending: false,
    name: "",
    location: "",
  });
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [trackResult, setTrackResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const fetchStatus = async () => {
    if (!contract || !address) return;
    try {
      setLoadingStatus(true);
      const result = await getRetailerStatus();
      setStatus(result);
    } catch (error) {
      console.error("Error fetching retailer status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [contract, address]);

  const fetchMyRequests = async () => {
    if (!contract || !address) return;
    try {
      setLoadingRequests(true);
      const all = await getAllSupplyRequests();
      const mine = all.filter(
        (r) => r.requester?.toLowerCase() === address?.toLowerCase(),
      );
      setMyRequests(mine);
    } catch (error) {
      console.error("Error fetching supply requests:", error);
      toast.error("Failed to load your requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (contract && activeTab === "requests") {
      fetchMyRequests();
    }
  }, [contract, activeTab, address]);

  const handleTrackPart = async (tokenId) => {
    try {
      setTrackingLoading(true);
      setTrackResult(null);
      const [authenticity, saleStatus, custodian, phoneNumber] =
        await Promise.all([
          verifyPartAuthenticity(tokenId),
          getSaleStatus(tokenId),
          getNFTCustodian(tokenId),
          getCustomerPhoneNumber(tokenId).catch(() => ""),
        ]);

      const statusNames = [
        "NEW",
        "RECALLED",
        "DEFECTIVE_RETURNED",
        "REPAIRED",
        "REFURBISHED",
      ];
      const saleStatusNames = ["UNSOLD", "IN_TRANSIT", "SOLD", "RETURNED"];

      setTrackResult({
        tokenId,
        isAuthentic: authenticity[0],
        status: statusNames[Number(authenticity[1])],
        saleStatus: saleStatusNames[Number(saleStatus)],
        custodian,
        phoneNumber,
        mintedAt: new Date(Number(authenticity[4]) * 1000).toLocaleString(),
      });
    } catch (error) {
      console.log(error);
      toast.error(error?.reason || "Part not found");
    } finally {
      setTrackingLoading(false);
    }
  };
  const preApprovalActions = [
    {
      title: "Request to Become Retailer",
      description: "Submit your details for a manufacturer to approve.",
      fields: [
        { name: "name", placeholder: "Company name" },
        { name: "location", placeholder: "Location" },
      ],
      onSubmit: async (v) => {
        await requestForRetailer(v.name, v.location);
        await fetchStatus();
      },
    },
  ];

  const approvedActions = [
    {
      title: "Create Supply Request",
      description: "Ask a manufacturer to supply you with parts.",
      fields: [
        { name: "productName", placeholder: "Product name (hashed on-chain)" },
        { name: "quantity", type: "number", placeholder: "Quantity (1-100)" },
      ],
      onSubmit: (v) =>
        createSupplyRequest(ethers.id(v.productName), Number(v.quantity)),
    },
    {
      title: "Ship Part to Customer",
      description: "Mark a part as shipped and attach customer details.",
      fields: [
        { name: "tokenId", type: "number", placeholder: "Token ID" },
        { name: "phoneNumber", placeholder: "Customer phone number" },
        { name: "trackingId", placeholder: "Tracking ID" },
      ],
      onSubmit: (v) => shipPart(v.tokenId, v.phoneNumber, v.trackingId),
    },
    {
      title: "Confirm Delivery",
      description: "Confirm the customer received their shipped part.",
      fields: [{ name: "tokenId", type: "number", placeholder: "Token ID" }],
      onSubmit: (v) => confirmDelivery(v.tokenId),
    },
    {
      title: "Report Defective Return",
      description: "Send a defective sold part back to its manufacturer.",
      fields: [{ name: "tokenId", type: "number", placeholder: "Token ID" }],
      onSubmit: (v) => reportDefectiveReturn(v.tokenId),
    },
  ];

  return (
    <div className="min-h-screen bg-[#1C2620] px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
                status.isRetailer
                  ? "border-[#4A5D48] bg-[#8FA88A]/10 text-[#8FA88A]"
                  : status.isPending
                    ? "border-yellow-800 bg-yellow-900/20 text-yellow-400"
                    : "border-[#4A5D48] bg-white/5 text-white/60"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status.isRetailer
                    ? "bg-[#8FA88A]"
                    : status.isPending
                      ? "bg-yellow-400"
                      : "bg-white/40"
                }`}
              />
              {loadingStatus
                ? "Checking status..."
                : status.isRetailer
                  ? "Approved Retailer"
                  : status.isPending
                    ? "Pending Manufacturer Approval"
                    : "Not Registered"}
            </span>
            <h1 className="mt-4 text-2xl font-bold text-white">
              Retailer Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Request supply, ship parts, and manage returns.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-2 border-b border-[#4A5D48]">
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
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "requests"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            My Supply Requests ({myRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("track")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "track"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Track a Part
          </button>
          <button
            onClick={() => setActiveTab("orderparts")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "orderparts"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Order Parts
          </button>
          <button
            onClick={() => setActiveTab("Myparts")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "Myparts"
                ? "text-[#8FA88A] border-b-2 border-[#8FA88A]"
                : "text-white/60 hover:text-white"
            }`}
          >
            My Parts
          </button>
        </div>

        {activeTab === "actions" && (
          <div className="mt-6 space-y-3">
            {!status.isRetailer && !loadingStatus && (
              <>
                {status.isPending && (
                  <div className="rounded-xl border border-dashed border-yellow-800 bg-yellow-900/10 p-4 text-sm text-yellow-400">
                    Your request has been submitted and is waiting on a
                    manufacturer to approve it. You'll be able to create
                    supply requests and ship parts once approved.
                  </div>
                )}
                {preApprovalActions.map((action) => (
                  <ManufactureCard key={action.title} {...action} />
                ))}
              </>
            )}

            {status.isRetailer && (
              <>
                <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-4 text-white mb-2">
                  <p className="text-sm font-semibold">{status.name}</p>
                  <p className="text-sm text-white/70">{status.location}</p>
                </div>
                {approvedActions.map((action) => (
                  <ManufactureCard key={action.title} {...action} />
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="mt-6">
            {loadingRequests ? (
              <div className="text-center py-20">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#8FA88A] border-t-transparent" />
                <p className="mt-4 text-white/60">Loading requests...</p>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-[#4A5D48] bg-[#243329]/50">
                <p className="text-white/60">
                  You haven't created any supply requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="rounded-lg border border-[#4A5D48] bg-[#243329] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Request {req.requestId} · Qty {req.quantity}
                      </p>
                      <p className="text-xs text-white/40 mt-1 truncate">
                        Product hash: {req.productHash}
                      </p>
                      <p className="text-xs text-white/40">
                        Requested:{" "}
                        {new Date(req.requestTime * 1000).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`self-start sm:self-auto rounded-full px-3 py-1 text-xs font-medium ${
                        req.fulfilled
                          ? "bg-green-900/50 text-green-400"
                          : "bg-yellow-900/50 text-yellow-400"
                      }`}
                    >
                      {req.fulfilled ? "Fulfilled" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "track" && (
          <div className="mt-6">
            <div className="rounded-lg border border-[#4A5D48] bg-[#243329] p-4">
              <p className="text-sm text-white/60 mb-3">
                Look up authenticity, sale status, and custodian for any
                token ID.
              </p>
              <TrackForm onSubmit={handleTrackPart} loading={trackingLoading} />
            </div>

            {trackResult && (
              <div className="mt-4 rounded-lg border border-[#4A5D48] bg-[#243329] p-4 text-white space-y-1">
                <p className="text-sm font-semibold">
                  Token #{trackResult.tokenId}
                </p>
                <p className="text-sm text-white/70">
                  Authentic:{" "}
                  <span
                    className={
                      trackResult.isAuthentic
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {trackResult.isAuthentic ? "Yes" : "No (recalled)"}
                  </span>
                </p>
                <p className="text-sm text-white/70">
                  Status: {trackResult.status}
                </p>
                <p className="text-sm text-white/70">
                  Sale status: {trackResult.saleStatus}
                </p>
                <p className="text-sm text-white/70 truncate">
                  Custodian: {trackResult.custodian}
                </p>
                {trackResult.phoneNumber && (
                  <p className="text-sm text-white/70">
                    Customer phone: {trackResult.phoneNumber}
                  </p>
                )}
                <p className="text-xs text-white/40">
                  Minted: {trackResult.mintedAt}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "orderparts" && (
            <div className="mt-6">
              <GetAllParts allowRequest={true}/>
            </div>
        )}
        {activeTab === "Myparts" && (
                      <div className="mt-6">
              <RetailerParts />
            </div>
        )}
      </div>
    </div>
  );
};

const TrackForm = ({ onSubmit, loading }) => {
  const [tokenId, setTokenId] = useState("");

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="number"
        placeholder="Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        className="flex-1 rounded-md border border-[#4A5D48] bg-[#1C2620] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8FA88A]"
      />
      <button
        onClick={() => tokenId !== "" && onSubmit(tokenId)}
        disabled={loading || tokenId === ""}
        className="rounded-md bg-[#8FA88A] px-6 py-2 text-sm font-semibold text-[#1C2620] transition-colors hover:bg-[#7A9776] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Looking up..." : "Track"}
      </button>
    </div>
  );
};

export default Page;