const express = require('express')
const router = new express.Router()

const Object = require('../models/object')

//router.get()
//router.post()
/*  - lista oggetti lista privata                           /:userId
    - ricerca oggetto                                       /:groupId/search
    - aggiunta oggetto                                      /:userId/:objId/addObj
    - rimozione oggetto                                     /:userId/:objId/remove
    - visualizza oggetti condivisi                          /:userId/:groupId/shared
    - condividi oggetto con gruppo                          /:userId/:groupId/:objId/shareObj
    - info oggetto                                          /:objId/info   
*/