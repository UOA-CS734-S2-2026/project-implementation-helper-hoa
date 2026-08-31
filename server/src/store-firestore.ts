import {
    ProductBatch,
    ProductRecord,
    User,
    NewProduct,
    NewBatch,
    HelperHoaStore,
} from './data'
import { db } from './firebase';


const products = db.collection('products')
const users = db.collection('users');
