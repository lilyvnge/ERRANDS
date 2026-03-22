const express = require('express');
const {
    rateUser,
    getUserRatings,
    getRatingSummary
} = require('../controllers/ratingController');
const auth = require('../middleware/auth');

const router = express.Router();

//All routes are protected
router.use(auth);

//Rate a user for a task
router.post('/tasks/:id/rate', rateUser);

//Get all ratings for a user
router.get('/users/:id/ratings', getUserRatings);

//Get rating summary for a user
router.get('/users/ratings/summary', getRatingSummary);

module.exports = router;