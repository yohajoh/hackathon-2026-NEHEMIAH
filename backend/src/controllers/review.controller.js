/**
 * Review Controller
 */

import * as reviewService from "../services/review.service.js";

export const getReviews = async (req, res) => {
  const { bookType, bookId } = req.params;
  const result = await reviewService.getReviews(bookType, bookId, req.query);
  res.json({ status: "success", ...result });
};

export const getMyReview = async (req, res) => {
  const { bookType, bookId } = req.params;
  const review = await reviewService.getMyReview(bookType, bookId, req.user.id);
  res.json({ status: "success", data: { review } });
};

export const getAllReviews = async (req, res) => {
  const result = await reviewService.getAllReviews(req.query);
  res.json({ status: "success", ...result });
};

export const createReview = async (req, res) => {
  const { bookType, bookId } = req.params;
  const result = await reviewService.createReview({
    userId: req.user.id,
    authContext: req.authContext,
    bookType,
    bookId,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  res.status(201).json({ status: "success", data: result });
};

export const updateReview = async (req, res) => {
  const result = await reviewService.updateReview(req.params.id, req.user.id, req.body);
  res.json({ status: "success", data: result });
};

export const deleteReview = async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user);
  res.json({ status: "success", message: "Review deleted successfully" });
};
