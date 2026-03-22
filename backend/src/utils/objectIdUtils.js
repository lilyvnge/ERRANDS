const mongoose = require('mongoose');

/**
 * Safely compare two ObjectIds or strings
 * @param {*} id1 - First ID (ObjectId or string)
 * @param {*} id2 - Second ID (ObjectId or string)
 * @returns {boolean} - True if IDs are equal
 **/

const areObjectIdsEqual = (id1, id2) => {
    if (!id1 || !id2) return false;

    //Convert both to string for comparison
    const str1 = id1.toString ? id1.toString() : String(id1);
    const str2 = id2.toString ? id2.toString() : String(id2);

    return str1 === str2;
};

// Convert to ObjectId safely
const toObjectId = (id) => {
    if (id instanceof mongoose.Types.ObjectId) return id;
    if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
    }
    return null;
};

/**
 * Check if user is authorized for a task (employer or assigned vendor)
 * @param {*} task - Task object
 * @param {*} userId - User ID to check
 * @returns {boolean} - True if user is authorized
 */
const isUserAuthorizedForTask = (task, userId) => {
  if (!task || !userId) return false;
  
  const isEmployer = task.employer && areObjectIdsEqual(task.employer._id || task.employer, userId);
  const isVendor = task.assignedVendor && areObjectIdsEqual(task.assignedVendor._id || task.assignedVendor, userId);
  
  return isEmployer || isVendor;
};


module.exports = {
    areObjectIdsEqual,
    toObjectId,
    isUserAuthorizedForTask
};