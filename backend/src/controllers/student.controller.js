import * as studentService from '../services/student.service.js';

export const getOverview = async (req, res) => {
  const data = await studentService.getStudentOverview(req.user.id);
  res.json({ status: 'success', data });
};

export const getRecommendations = async (req, res) => {
  const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 8));
  const data = await studentService.getStudentRecommendations(req.user.id, limit);
  res.json({ status: 'success', data });
};
