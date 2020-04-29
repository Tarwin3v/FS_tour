const catchAsyncErr = require('./../utils/catchAsyncErr');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsyncErr(async (req, res, next) => {
    //@d SELECT OUR DOC BY ID IN OUR DB // https://mongoosejs.com/docs/api.html#model_Model.findByIdAndDelete
    const doc = await Model.findByIdAndDelete(req.params.id);

    //@m IF !DOC THROW OUR CUSTOM ERROR WITH 404 NOT FOUND STATUS CODE
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    //@q ELSE SEND OUR RES TO CLIENT WITH STATUS CODE 204 NOT FOUND
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsyncErr(async (req, res, next) => {
    //@d SELECT OUR DOC BY ID  // https://mongoosejs.com/docs/api.html#model_Model.findByIdAndUpdate
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // bool - true to return the modified document rather than the original.
      runValidators: true // if true, runs update validators on this command. Update validators validate the update operation against the model's schema.
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    //@q ELSE SEND OUR RES TO CLIENT WITH STATUS CODE 200 OK && OUR UPDATED DOC AS DATA
    res.status(200).json({
      status: 'success',
      data: {
        document: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsyncErr(async (req, res, next) => {
    //@d https://mongoosejs.com/docs/api/model.html#model_Model.create
    const doc = await Model.create(req.body);

    //@q SEND RESPONSE WITH STATUS 201 CREATED && DATA
    res.status(201).json({
      status: 'success',
      data: {
        document: doc
      }
    });
  });

exports.getOne = (Model, populateOption) =>
  catchAsyncErr(async (req, res, next) => {
    //@d SELECT OUR DOC BY ID // https://mongoosejs.com/docs/api.html#model_Model.findById
    let query = Model.findById(req.params.id);

    //@d IF POPULATE OPTION IN QUERY  // https://mongoosejs.com/docs/populate.html
    if (populateOption) query = query.populate(populateOption);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        document: doc
      }
    });
  });

exports.getAll = Model =>
  catchAsyncErr(async (req, res, next) => {
    //@q ALLOW US TO MUTATE OUR QUERY TO GET ALL NESTED REVIEWS IN OUR TOUR
    let filter = {};

    //@q IF TOUR ID IN OUR REQ.PARAMS WE PUT THIS ID IN OUR FILTER OBJECT
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //@d WE USE THIS FILTER OBJECT TO FIND OUR REVIEWS // https://mongoosejs.com/docs/api.html#model_Model.find
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    ////////.explain() // https://docs.mongodb.com/manual/reference/method/cursor.explain/

    //@d WE AWAIT OUR BUILD UP QUERY TO GET THE FINAL DATA AND SEND IT TO CLIENT
    const docs = await features.query;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        documents: docs
      }
    });
  });
