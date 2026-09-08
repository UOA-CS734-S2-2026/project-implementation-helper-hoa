# Documentation of server logic

# types/index.ts
This starts off by defining the tables (collections in NoSQL, kinda trippy ngl) that are stored in the db
- ProductRecords
- BatchRecords
- Users

Then it defines classes (I understand them as input dto's from C# bakcground) for new rows/objects
- NewProduct
- NewBatch

# store/


**index.ts**

This defines what types of read and write operations can be sent to the server via the HelperHoaStore interface

*Read Operations*
- products
- product(id)
- user(id)

*Write Operations*
- sellProduct(id, quant, batchNumber)
- createBatch(productid, NewBatch)
- createProduct(newProduct)


**mappers.ts**

This is where the logic for mapping the stores json objects into readbale/usable json documents for the api and app
- toProductBatch
- toProductRecord
- toUser

Conversely we have functions that define how to tack app types and create the corresponding database objects, with correct innit values
- toFirestoreProduct
- toFirestoreBatch


**store-firebase.ts**

Lastly we have the function that implements all of the above, namely **FirebaseHoaStore**


# Example tests

get your JWT with:
`npx tsx src/scripts/get-token.ts`

`curl -X GET http://localhost:3000/products \                           
  -H "Authorization: Bearer $TOKEN"`

```
curl -X POST http://localhost:3000/products/prod_dell_monitor/sell \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'
  ```
