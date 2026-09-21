import AutoPart from "./autoPartModel.js";
import { ethers } from "ethers";
import ABI from "../contractABI/AutoPartNFT_Pro_.json" with { type: "json" };
import { config } from "../config/config.js";
import MintedUnit from "./mintedUnitModel.js";

const getContract = async () => {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc_url);
    const wallet = new ethers.Wallet(config.privatekey, provider);
    return new ethers.Contract(config.contractAddress, ABI.abi, wallet);
  } catch (error) {
    console.log("error getting contract:", error);
  }
};

export const recordMintedUnit = async (req, res) => {
  try {
    const { id } = req.params; // autoPart id
    const { tokenId, retailerAddress, transactionHash } = req.body;

    if (tokenId === undefined || tokenId === null) {
      return res.status(400).json({ status: "error", message: "tokenId is required" });
    }

    const part = await AutoPart.findOne({ _id: id, isActive: true });
    if (!part) {
      return res.status(404).json({ status: "error", message: "Part not found" });
    }

    if (part.mintedCount >= part.quantity) {
      return res.status(400).json({
        status: "error",
        message: "No remaining quantity to mint for this part",
      });
    }

    // Guard against double-recording the same on-chain mint
    const existing = await MintedUnit.findOne({ tokenId });
    if (existing) {
      return res.status(409).json({
        status: "error",
        message: `tokenId ${tokenId} is already recorded`,
      });
    }

    const unit = await MintedUnit.create({
      autoPart: part._id,
      tokenId,
      retailerAddress: retailerAddress?.toLowerCase(),
      transactionHash,
      mintedBy: part.createdBy?.address,
    });

    part.mintedCount += 1;
    await part.save();

    res.status(201).json({
      status: "success",
      data: { unit, part },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

export const getUnitsForPart = async (req, res) => {
  try {
    const units = await MintedUnit.find({ autoPart: req.params.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ status: "success", data: { units } });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

export const getAllUnitsForManufacturer = async (req, res) => {
  try {
    const { address } = req.query;
    const parts = await AutoPart.find({
      "createdBy.address": address?.toLowerCase(),
      isActive: true,
    }).select("_id");
    const partIds = parts.map((p) => p._id);
    const units = await MintedUnit.find({ autoPart: { $in: partIds } })
      .populate("autoPart")
      .sort({ createdAt: -1 });
    res.status(200).json({ status: "success", data: { units } });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

export const createautoPart = async (req, res, next) => {
  try {
    const walletAddress = req.body.walletAddress; 
    const { walletAddress: _omit, ...partData } = req.body;
    const autoPart = await AutoPart.create({
      ...req.body,
      contractAddress: config.contractAddress,
      createdBy: {
        address: walletAddress.toLowerCase(),
        role: "manufacturer",
      },
    });
    res.status(201).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getAllAutoParts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, brandName, search } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    if (brandName) query.brandName = brandName;

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [autoParts, total] = await Promise.all([
      AutoPart.find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      AutoPart.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      data: { autoParts },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "success",
      message: error.message,
    });
  }
};

export const getAutoPart = async (req, res, next) => {
  try {
    const autoPart = await AutoPart.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: "error.message",
    });
  }
};

export const getAutoPartByTokenId = async (req, res) => {
  try {
    const autoPart = await AutoPart.findOne({
      tokenId: req.params.tokenId,
      isActive: true,
    });

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "part not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const updateAutoPart = async (req, res) => {
  try {
    const autoPart = await AutoPart.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      req.body,
      { new: true, runValidators: true },
    );

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }
    res.status(200).json({
      status: "success",
      data: { autoPart },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const deleteAutoPart = async (req, res) => {
  try {
    const autoPart = await AutoPart.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!autoPart) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const mintAutoPart = async (req, res) => {
  try {
    const { partId, retailerAddress } = req.body;

    const part = await AutoPart.findById(partId);

    if (!part) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    if (part.tokenId) {
      return res.status(400).json({
        status: "error",
        message: "Part already minted",
      });
    }

    const contract = await getContract();

    const tx = await contract.mintPartToRetailer(
      retailerAddress,
      part.tokenURI,
      part.metadataHash,
    );

    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log) => contract.interface.parseLog(log))
      .find((parsed) => parsed && parsed.name === "PartMinted");

    if (event) {
      part.tokenId = Number(event.args.tokenId);
      await part.save();
    }

    res.status(200).json({
      status: "success",
      data: {
        part,
        transactionHash: receipt.hash,
        tokenId: part.tokenId,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getUnitsForRetailer = async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ status: "error", message: "address is required" });
    }
    const units = await MintedUnit.find({ retailerAddress: address.toLowerCase() })
      .populate("autoPart")
      .sort({ createdAt: -1 });
    res.status(200).json({ status: "success", data: { units } });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};


export const recordMintedUnitsBatch = async (req, res) => {
  try {
    const { id } = req.params; // autoPart id
    const { tokenIds, retailerAddress, transactionHash } = req.body;

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return res.status(400).json({ status: "error", message: "tokenIds array is required" });
    }

    const part = await AutoPart.findOne({ _id: id, isActive: true });
    if (!part) {
      return res.status(404).json({ status: "error", message: "Part not found" });
    }

    const remaining = part.quantity - part.mintedCount;
    if (tokenIds.length > remaining) {
      return res.status(400).json({
        status: "error",
        message: `Only ${remaining} remaining, cannot record ${tokenIds.length} units`,
      });
    }

    const existing = await MintedUnit.find({ tokenId: { $in: tokenIds } });
    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: `Some tokenIds already recorded: ${existing.map((u) => u.tokenId).join(", ")}`,
      });
    }

    const docs = tokenIds.map((tokenId) => ({
      autoPart: part._id,
      tokenId,
      retailerAddress: retailerAddress?.toLowerCase(),
      transactionHash,
      mintedBy: part.createdBy?.address,
    }));

    const units = await MintedUnit.insertMany(docs);

    part.mintedCount += tokenIds.length;
    await part.save();

    res.status(201).json({ status: "success", data: { units, part } });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

export const syncPartWithBlockchain = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const part = await AutoPart.findOne({ tokenId });
    if (!part) {
      return res.status(404).json({
        status: "error",
        message: "Part not found",
      });
    }

    const contract = await getContract();

    const custodian = await contract.getNFTCustodian(tokenId);

    const partDetails = await contract.parts(tokenId);

    const saleStatus = await contract.getSaleStatus(tokenId);

    const owner = await contract.ownerOf(tokenId);

    res.status(200).json({
      status: "success",
      data: {
        custodian,
        status: Object.keys(partDetails.status)[0],
        saleStatus: Object.keys(saleStatus)[0],
        owner,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};
