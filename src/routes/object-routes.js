const express = require('express')
const objectid = require('objectid')
const router = new express.Router()

const Object = require('../models/object')
const Image = require('../models/image')

// Wrapper DONE
// Endpoint to register a new object
// Params body:
// object_name
// object_description
router.post('/:user_id', async (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const {
    object_name, object_description
  } = req.body
  if (!(object_name && object_description)) {
    return res.status(400).send('Bad Request')
  }
  try {
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
      owner_id: req.params.user_id,
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

// Wrapper DONE
// Endpoint to get your objects
// Params body:
// user_id
router.post('/:user_id/objects', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params.user_id
  Object.find({ owner_id: id }).then(objects => {
    if (!objects) {
      return res.status(404).send('No objects for this user')
    }
    res.json(objects)
  }).catch(next)
})

// Endpoint to search an onject
// Params body:
// user_id
// group_id
router.post('/:obj_id/search', (req, res, next) => {
  if (!req.user_id || !req.group_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id })
    .populate('image')
    .lean()
    .exec()
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      res.json(obj)
    }).catch(next)
})

// Endpoint to remove an object
// Params body
// user_id
router.post('/:obj_id/remove', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.remove(obj_id).then(obj => {
    if (!obj) {
      return res.status(404).send('Object not found')
    }
  }).catch(next)
})

// Endpoint to show shared objects of the group
// Params body:
// user_id
router.post('/:group_id/sharedObjs', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  // const group_id = req.params.group_id
})

// Endpoint to share an object in the group
// Params body:
// user_id
// group_id
router.post('/group/:id/shareObj', (req, res, next) => {
  // da vedere
})
