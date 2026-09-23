import express from "express";

import {
  createautoPart,
  getAllAutoParts,
  getAutoPart,
  getAutoPartByTokenId,
  updateAutoPart,
  deleteAutoPart,
  mintAutoPart,
  syncPartWithBlockchain,
  recordMintedUnit,
  getUnitsForPart,
  getAllUnitsForManufacturer,
  getUnitsForRetailer,      
  recordMintedUnitsBatch,
  getUnitByTokenId,
} from "./autopartController.js";

const router = express.Router();


router.get("/token/:tokenId", getAutoPartByTokenId);
router.post("/sync/:tokenId", syncPartWithBlockchain);
router.get("/units", getAllUnitsForManufacturer);
router.get("/retailer/units", getUnitsForRetailer);
router.get("/units/token/:tokenId", getUnitByTokenId);

router.get("/", getAllAutoParts);

router.get("/:id", getAutoPart);
router.post("/createautoParts", createautoPart);
router.patch("/:id", updateAutoPart);
router.delete("/:id", deleteAutoPart);
router.post("/mint", mintAutoPart);
router.post("/:id/units", recordMintedUnit);
router.get("/:id/units", getUnitsForPart);
router.post("/:id/units/batch", recordMintedUnitsBatch);

export default router;
