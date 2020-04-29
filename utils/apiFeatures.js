// ======================================================================
//@a FEATURES CLASS HANDLE SORT / FIELDS && PAGINATE QUERIES // https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/
// ======================================================================

class APIFeatures {
  // OUR CLASS NEED THE QUERY OBJECT && THE QUERY STRING OBJECT { sort: 'price,-ratingsAverage' }
  constructor(query, queryString) {
    this.query = query; // THE FINAL QUERY THAT WE WILL USE TO REQ OUR DB
    this.queryString = queryString; // INITIAL REQ.QUERY THAT WE WILL MUTATE WITH OUR DIFFERENT METHODS
  }

  filter() {
    const queryObj = { ...this.queryString }; // HARD COPY OUR QUERY STRING OBJECT(REQ.QUERY FROM EXPRESS) { sort: 'price,-ratingsAverage' }
    const excludedFields = ['page', 'sort', 'limit', 'fields']; // WE CREATE AN ARRAY WITH THE EXCLUDED PARAMETERS WE DONT WANT TO MAKE DB REQUEST WITH IT
    excludedFields.forEach(el => delete queryObj[el]); // FILTER OUT OUR EXCLUDED FIELDS FROM OUR QUERY OBJ

    let queryStr = JSON.stringify(queryObj); // MUTATE OUR QUERY STRING  TYPE FROM OBJ TO STRING TO USE REPLACE ON IT
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); // WE ADD THE $ SIGN BEFORE OUR QUERY OPERATOR TO VALIDATE IT AS NATIVE MONGODB REQ {DURATION : {GTE: '5}} >>> {DURATION : {$GTE:'5'}}
    this.query = this.query.find(JSON.parse(queryStr)); // MUTATE OUR STRING TYPE TO OBJECT TO BE USED IN OUR REQ TO DATABASE
    return this; // RETURN THE OBJECT INSTANCE TO ALLOW OUR NEXT FUNCTION TO MUTATE OUR QUERY ASWELL
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); // WE MUTATE OUR QUERY STRING FOR THE MONGOOSE SYNTAX FROM {SORT: 'PRICE,CREATEDAT'} TO ('PRICE CREATEDAT') SYNTAX USABLE FOR MONGOOSE QUERY
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt -ratingsAverage'); // IMPLANT DEFAULT SORTING BY CREATED AT FIELD & RATING
    }
    return this; // RETURN THE OBJECT INSTANCE AGAIN
  }

  // LIMITFIELDS FLOW IS EXACTLY THE SAME AS SORT
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // CONVERT STRING TO INT // DEFAULT OF 1
    const limit = this.queryString.limit * 1 || 100; // CONVERT STRING TO INT // DEFAULT OF 100
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
