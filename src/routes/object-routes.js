const express = require('express')
const objectid = require('objectid')
const router = new express.Router()

const Object = require('../models/object')

// Endpoint to register a new object
router.post('/:id', async (req, res, next) => {
  const {
    object_name, object_description
  } = req.body
  if (!(object_name && object_description))
    return res.status(400).send('Bad Request')
  try {
    // Non serve questo controllo, ci possono essere più oggetti con lo stesso nome
    const object = await Object.findOne({ object_name })
    if (object)
      return res.status(409).send('Object already exists')

    const object_id = objectid()
    const image_id = objectid()
    const newObject = {
      object_id,
      object_name,
      image_id,
      object_description,
      owner_id: req.params
    }
    const image = {
      image_id,
      owner_type: 'user',
      owner_id: req.params,
      path: '/images/profiles/object_default_photo.png',
      thumbnail_path: '/images/profiles/object_default_photo.png'
    }

    await Object.create(newObject)
    await Image.create(image)
    const response = {
      id: object_id,
      name: object_name,
      image: '/images/profiles/object_default_photo.png'
    }
    res.json(response)
  } catch (err) {
    next(err)
  }
})

// Endpoint to get your objects
router.get('/:id', (req, res, next) => {
  if ( req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params
  Object.find({ owner_id: id }).then(objects => {
    if (!objects)
      return res.status(404).send("No objects for this user")  
    res.json(objects)
  }).catch(next)
})



// router.post()
/*  - lista oggetti lista privata                           /:userId
    - ricerca oggetto                                       /:groupId/search
    - rimozione oggetto                                     /:userId/:objId/remove
    - visualizza oggetti condivisi                          /:userId/:groupId/shared
    - condividi oggetto con gruppo                          /:userId/:groupId/:objId/shareObj
    - info oggetto                                          /:objId/info
*/