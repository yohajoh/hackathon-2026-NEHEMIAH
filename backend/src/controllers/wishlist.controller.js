/**
 * Wishlist Controller
 */

import * as wishlistService from "../services/wishlist.service.js";

export const getMyWishlist = async (req, res) => {
  const result = await wishlistService.getMyWishlist(req.user.id, req.query);
  res.json({ status: "success", ...result });
};

export const checkWishlistStatus = async (req, res) => {
  const { bookType, bookId } = req.params;
  const data = await wishlistService.checkWishlistStatus(req.user.id, bookType, bookId);
  res.json({ status: "success", data });
};

export const addToWishlist = async (req, res) => {
  const item = await wishlistService.addToWishlist(req.user.id, req.body);

  res.status(201).json({ status: "success", data: { item } });
};

export const removeFromWishlist = async (req, res) => {
  await wishlistService.removeFromWishlist(req.params.id, req.user.id);

  res.json({ status: "success", message: "Removed from wishlist" });
};

export const removeFromWishlistByBook = async (req, res) => {
  await wishlistService.removeFromWishlistByBook(req.user.id, req.body);

  res.json({ status: "success", message: "Removed from wishlist" });
};
