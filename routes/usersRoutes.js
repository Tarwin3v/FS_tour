const express = require('express');
const usersCtrl = require('./../controllers/usersCtrl');
const authCtrl = require('./../controllers/authCtrl');

const router = express.Router();

router.post('/signUp', authCtrl.signUp);
router.post('/logIn', authCtrl.logIn);
router.get('/logout', authCtrl.logOut);

router.post('/forgotPassword', authCtrl.forgotPassword);
router.patch('/resetPassword/:token', authCtrl.resetPassword);

//@o Logged in Users
router.use(authCtrl.protect);

router.patch('/updateMyPassword', authCtrl.updatePassword);
router.get('/me', usersCtrl.getMe, usersCtrl.getUser);
router.patch(
  '/updateMe',
  usersCtrl.uploadUserPhoto,
  usersCtrl.resizeUserPhoto,
  usersCtrl.updateMe
);
router.delete('/deleteMe', usersCtrl.deleteMe);

//@o Admin access
router.use(authCtrl.restrictTo('admin'));

router.route('/').get(usersCtrl.getAllUsers);

router
  .route('/:id')
  .get(usersCtrl.getUser)
  .patch(usersCtrl.updateUser)
  .delete(usersCtrl.deleteUser);

module.exports = router;
