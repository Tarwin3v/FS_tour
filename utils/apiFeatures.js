class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; // on créé une copie de l'objet que l'on veut modifier
    console.log(this.query); // enorme objet
    console.log(this.queryString); // /?sort= -date,price  ====> queryString >>>> {sort:'-date, price}
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]); // on boucle autour d'une liste d'exclus

    let queryStr = JSON.stringify(queryObj); // on transforme l'objet en string pour pouvoir utiliser une mthd replace sur lui
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); // on modifie les requetes API pour qu'elles correspondent à une requete Mongodb native

    this.query = this.query.find(JSON.parse(queryStr)); // on retransforme le string en objet pour pouvoir l'utiliser en tant qu'argument de find()

    return this; // on retourne this pour pouvoir enchainer l'utilisation des fonctions en instance
  }

  sort() {
    if (this.queryString.sort) {
      // s'il y' a presence de sort dans la requete API alors ...
      console.log(this.queryString.sort);
      const sortBy = this.queryString.sort.split(',').join(' '); // on reformule le contenu de queryString.sort pour qu'il soit utilisé en tant qu'argument pour utiliser la methode sort() sur la requete HTTP
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt -ratingsAverage'); // on veut que les documents soient classés par date de creation ainsi que notation par default
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      // si presence de fields dans l'objet queryString
      const fields = this.queryString.fields.split(',').join(' '); // meme schema que pour sort
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // si presence de page dans la requete alors conversion de la donnée page de string à number et s'il n'y a pas de pages alors 1 comme valeure par defaut
    const limit = this.queryString.limit * 1 || 100; // meme schema mais pour limite
    const skip = (page - 1) * limit; // petit calcul permettant d'utiliser la variable en argument de la methode skip() qui fait exactement ce qu'elle semble faire

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
