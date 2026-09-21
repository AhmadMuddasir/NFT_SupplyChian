"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { ABI, ContractAddress } from "@/lib/contract/constans";
import toast from "react-hot-toast";
import { getFriendlyError } from "@/lib/utils/contractError";

const ContractContext = createContext(null);

export const ContractProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [requestNotification, setrequestNotification] = useState(0);
  const CHUNK_SIZE = 20;

  const getSignerAndContract = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("metamask or wallet not detected");
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(ContractAddress, ABI.abi, signer);

    return { signer, provider, contract };
  };
  useEffect(() => {
    const loadData = async () => {
      if (isConnected && address) {
        try {
          const { signer, provider, contract } = await getSignerAndContract();
          setSigner(signer);
          setContract(contract);
          setProvider(provider);
        } catch (error) {
          console.log(error);
        }
      } else {
        setSigner(null);
        setContract(null);
        setProvider(null);
      }
    };
    loadData();
  }, [isConnected, address]);

  const joinAsManufacturer = async (name, location) => {
    try {
      if (!contract) throw new Error("Contract not initaialize");
      const MANUFACTURER_ROLE = await contract.MANUFACTURER_ROLE();
      const hasRole = await contract.hasRole(MANUFACTURER_ROLE, address);
      if (hasRole) {
        toast.error("you are already a manufaturer");
        return;
      }
      const tnx = await contract.joinAsManufacturer(name, location);
      return await tnx.wait();
    } catch (error) {
      console.log(error);
      throw new Error(getFriendlyError(error));

    }
  };

  const addRetailer = async (retailerAddress) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.addRetailer(retailerAddress);
      return await tx.wait();
    } catch (error) {
      throw new Error(getFriendlyError(error));
    }
  };

  const AddRetailerDirectly = async (retailerAddress, name, location) => {
    if (!contract) throw new Error("Contract not initialized");
    const tx = await contract.AddRetailerDirectly(
      retailerAddress,
      name,
      location,
    );
    return await tx.wait();
  };

  const mintToRetailer = async (retailerAddress, tokenURI, metadataHash) => {
    try {
      
      if (!contract) throw new Error("Contract not initialized");
      
    const tx = await contract.mintPartToRetailer(
      retailerAddress,
      tokenURI,
      metadataHash,
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "PartMinted");

    const tokenId = event ? Number(event.args.tokenId) : null;

    console.log(" Minted tokenId:", tokenId);
    
    return { tokenId, receipt };
  } catch (error) {
    console.log("mintToRetailer error:",error)
    throw new Error(getFriendlyError(error));
  }
  };

  const removeRetailer = async (retailerAddress) => {
    try {      
      if (!contract) throw new Error("Contract not initaialize");
      const tnx = await contract.removeRetailer(retailerAddress);
      return await tnx.wait();
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };

const fullfillSupplyRequest = async (requestId, uris, metadataHashed) => {
  try {
    if (!contract) throw new Error("Contract not initaialize");
    const tnx = await contract.fulfillSupplyRequest(requestId, uris, metadataHashed);
    const receipt = await tnx.wait();

    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "SupplyRequestFulfilled");

    const tokenIds = event ? event.args.tokenIds.map((t) => Number(t)) : [];

    return { receipt, tokenIds }; 
  } catch (error) {
    throw new Error(getFriendlyError(error));
  }
};

  const repairPart = async (tokenId) => {
    try {      
      if (!contract) throw new Error("Contract not initaialize");
      try {
      await contract.ownerOf(tokenId);
    } catch {
      throw new Error(" This token ID does not exist on-chain");
    }
      const tnx = await contract.repairPart(tokenId);
      return await tnx.wait();
    } catch (error) {
        throw new Error(getFriendlyError(error));
    }
  };
  const refurbishedPart = async (tokenId) => {
    try {
      
      if (!contract) throw new Error("Contract not initaialize");
      try {
      await contract.ownerOf(tokenId);
    } catch {
      throw new Error(" This token ID does not exist on-chain");
    }
      const tnx = await contract.refurbishPart(tokenId);
      return await tnx.wait();
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };
  const recallPart = async (tokenId) => {
    try {      
      if (!contract) throw new Error("Contract not initaialize");
    try {
      await contract.ownerOf(tokenId);
    } catch {
      throw new Error(" This token ID does not exist on-chain");
    }

      const tnx = await contract.recallPart(tokenId);
      return await tnx.wait();
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };
  const cancelSupplyRequest = async (requestId) => {
    try {
      if (!contract) throw new Error("Contract not initaialize");
      console.log("upto here")
      const tnx = await contract.cancelSupplyRequest(requestId);
      return await tnx.wait();
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };

  const transferToRetailer = async (to, tokenId) => {
    try {  
      if (!contract) throw new Error("Contract not initaialize");
      const tnx = await contract.transferToRetailer(to, tokenId);
      return await tnx.wait();
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };

  const batchMintToRetailer = async (
    retailerAddress,
    quantity,
    tokenURI,
    metadataHash,
    onProgress,
  ) => {
    if (!contract) throw new Error("Contract not initialized");
    if (quantity <= 0) throw new Error("Quantity must be greater than 0");

    const allTokenIds = [];

    for (let i = 0; i < quantity; i += CHUNK_SIZE) {
      const size = Math.min(CHUNK_SIZE, quantity - i);

      const tx = await contract.batchMintToRetailers(
        Array(size).fill(retailerAddress),
        Array(size).fill(tokenURI),
        Array(size).fill(metadataHash),
      );
      const receipt = await tx.wait();

      // collect tokenIds from PartMinted events
      receipt.logs.forEach((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "PartMinted") {
            allTokenIds.push(parsed.args.tokenId);
          }
        } catch (_) {
      throw new Error(getFriendlyError(error));
        }
      });

      const done = Math.min(i + CHUNK_SIZE, quantity);
      if (onProgress) onProgress(done, quantity);
    }

    return allTokenIds;
  };

  const getRetailerRequests = async () => {
    try {
      if (!contract) throw new Error("wait or refresh the page");
      const result = await contract.getRetailerRequests(); // returns address[]
  
      const addresses = Array.from(result);
  
      const requests = await Promise.all(
        addresses.map(async (addr) => {
          const details = await contract.retailerDetails(addr);
          return {
            address: addr,
            name: details[0],
            location: details[1],
            isApprove: details[2],
          };
        }),
      );
  
      return requests.filter((r) => !r.isApprove);
    } catch (error) {
            throw new Error(getFriendlyError(error));

    }
  };

  const requestForRetailer = async (name, location) => {
    try {
      
      if (!contract) throw new Error("Contract not initaialize");
      const tnx = await contract.requestForRetailer(name, location);
      setrequestNotification((prev) => prev + 1);
      return await tnx.wait();
    } catch (error) {
        throw new Error(getFriendlyError(error));
    }
  };

  const getRetailerStatus = async () => {
    try {
      if (!contract || !address) {
        return {
          isRetailer: false,
          isPending: false,
          name: "",
          location: "",
        };
      }
      const RETAILER_ROLE = await contract.RETAILER_ROLE();
      const isRetailer = await contract.hasRole(RETAILER_ROLE, address);
      const details = await contract.retailerDetails(address);
      const name = details[0];
      const location = details[1];
  
      return {
        isRetailer,
        // has called requestForRetailer (name is set) but not yet approved
        isPending: !isRetailer && name && name.length > 0,
        name,
        location,
      };
    } catch (error) {
            throw new Error(getFriendlyError(error));
    }
  };

  const getRetailerDetails = async (retailerAddress) => {
    try {
      
      if (!contract) throw new Error("wait or refresh the page");
      if (!retailerAddress || retailerAddress === ethers.ZeroAddress) {
        return { name: "", location: "", isApprove: false };
      }
      const details = await contract.retailerDetails(retailerAddress);
      return {
        name: details[0],
        location: details[1],
        isApprove: details[2],
      };
    } catch (error) {
            throw new Error(getFriendlyError(error));

    }
  };

  const createSupplyRequest = async (productHash, quantity) => {
    try {
      if (!contract) throw new Error("Contract not initailize");
      const tnx = await contract.createSupplyRequest(productHash, quantity);
      return await tnx.wait();
      
    } catch (error) {
        throw new Error(getFriendlyError(error));

    }
  };
  const shipPart = async (tokenId, PhoneNumber, trackingId) => {
        try {
      
          if (!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.shipPart(tokenId, PhoneNumber, trackingId);
          return await tnx.wait();
    } catch (error) {
        throw new Error(getFriendlyError(error));

    }
  };
  const confirmDelivery = async (tokenId) => {
        try {    
          if (!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.confirmDelivery(tokenId);
          return await tnx.wait();
    } catch (error) {
        throw new Error(getFriendlyError(error));

    }
  };
  const reportDefectiveReturn = async (tokenId) => {
      try {
      
          if (!contract) throw new Error("Contract not initailaze");
          const tnx = await contract.reportDefectiveReturn(tokenId);
          return await tnx.wait();
    } catch (error) {
        throw new Error(getFriendlyError(error));

    }
  };

  // read functions

  const getAllManufacturers = async () => {
        try {
          if (!contract) throw new Error("wait or refresh the page");
          const result = await contract.getAllManufacturers();
      
          const addresses = Array.from(result[0]);
          const names = Array.from(result[1]);
          const locations = Array.from(result[2]);
      
          return addresses.map((addr, i) => ({
            address: addr,
            name: names[i],
            location: locations[i],
          }));
    } catch (error) {
        throw new Error(getFriendlyError(error));

    }
  };

  const getAllRetailers = async () => {
    return await contract.getAllRetailers();
  };

  const getCustomerPhoneNumber = async (tokenId) => {
    return await contract.getCustomerPhoneNumber(tokenId);
  };

  const getNFTCustodian = async (tokenId) => {
    return await contract.getNFTCustodian(tokenId);
  };
  const getSaleStatus = async (tokenId) => {
    return await contract.getSaleStatus(tokenId);
  };

  const getSupplyRequest = async (requestId) => {
    if (!contract) throw new Error("wait or refresh the page");
    const data =  await contract.supplyRequests(requestId);
    console.log("getSupplyRequest ",data);
    return data;
  };

const getAllSupplyRequests = async () => {
  if (!contract) throw new Error("wait or refresh the page");
  const requests = [];
  let consecutiveEmpty = 0;

  for (let id = 0; id < 100; id++) {
    const req = await contract.supplyRequests(id);
    if (req.requester === ethers.ZeroAddress) {
      consecutiveEmpty++;
      if (consecutiveEmpty > 5) break;
      continue;
    }
    consecutiveEmpty = 0;
    requests.push({
      requestId: id,
      requester: req.requester,
      productHash: req.productHash,
      quantity: Number(req.quantity),
      requestTime: Number(req.requestTime),
      fulfilled: req.fulfilled,
    });
  }
  return requests;
};
  const verifyPartAuthenticity = async (tokenId) => {
    return await contract.verifyPartAuthenticity(tokenId);
  };

  const value = {
    address,
    isConnected,
    signer,
    provider,
    contract,
    joinAsManufacturer,
    addRetailer,
    removeRetailer,
    fullfillSupplyRequest,
    repairPart,
    refurbishedPart,
    recallPart,
    transferToRetailer,
    requestForRetailer,
    createSupplyRequest,
    shipPart,
    confirmDelivery,
    reportDefectiveReturn,
    getRetailerStatus,
    getRetailerDetails,
    getAllManufacturers,
    getAllRetailers,
    getCustomerPhoneNumber,
    getNFTCustodian,
    getSaleStatus,
    verifyPartAuthenticity,
    mintToRetailer,
    AddRetailerDirectly,
    getRetailerRequests,
    batchMintToRetailer,
    getSupplyRequest,
    getAllSupplyRequests,
    cancelSupplyRequest,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => {
  const context = useContext(ContractContext);
  return context;
};
