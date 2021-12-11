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
// Endpoint to get your lent objects
// Params body:
// user_id
router.post('/:user_id/lentObjects', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params.user_id
  Object.find({ owner_id: id }).then(objects => {
    if (!objects) {
      return res.status(404).send('No objects for this user')
    }
    res.json(objects)
  }).catch(next)
})

// Wrapped DONE
// Endpoint to get your borrowed objects
// Params body:
// user_id
router.post('/:user_id/borrowedObjects', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params.user_id
  Object.find({ shared_with_user: id }).then(objects => {
    if (!objects) {
      return res.status(404).send('No objects for this user')
    }
    res.json(objects)
  }).catch(next)
})

// Endpoint to search an object
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

// Endpoint to remove an object from the system
// Params body
// user_id
router.post('/:obj_id/remove', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.remove({ obj_id }).then(obj => {
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
  const group_id = req.params.group_id
  Object.find({ group_ids: group_id })
    .then(objects => {
      if (!objects) {
        return res.status(404).send('No shared objects for this group')
      }
      res.json(objects)
    }).catch(next)
})

// Endpoint to show user's shared objects with the group
// Params body:
// user_id
router.post('/:group_id/mySharedObjs', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const group_id = req.params.group_id
  Object.find({ group_ids: group_id } && { owner_id: req.user_id })
    .then(objects => {
      if (!objects) {
        return res.status(404).send('You have no shared objects with this group')
      }
      res.json(objects)
    }).catch(next)
})

// Endpoint to remove an object from a group
// Params body
// user_id
// group_id
router.post('/:obj_id/remove', (req, res, next) => {
  if (!req.user_id || !req.group_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id }).then(obj => {
    if (!obj) {
      return res.status(404).send('Object not found')
    }
    const index = obj.group_ids.indexOf(req.group_id)
    if (!index) {
      return res.status(404).send('Object not shared in this group')
    }
    obj.group_ids.pull(index, 1)
  }).catch(next)
})

// Endpoint to share an object with the group
// Params body:
// user_id
// group_id
router.post('/group/:obj_id/shareObj', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      obj.group_ids.push(req.body.group_id)
    }).catch(next)
})

// Endpoint to send share request
// Params body:
// user_id
router.post('/:obj_id/share', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      if (obj.shared_with_user) {
        return res.status(404).send('Object not available')
      }
      res.json(obj)
    }).catch(next)
})

// Endpoint to accept share request
// Params body:
// user_id
router.post('/:obj_id/share/accept', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      obj.shared_with_user = req.body.user_id
      res.json(obj)
    }).catch(next)
})

// Endpoint to notify object return
// Params body:
// user_id
router.post('/:obj_id/share/return', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const obj_id = req.params.obj_id
  Object.findOne({ obj_id })
    .then(obj => {
      if (!obj) {
        return res.status(404).send('Object not found')
      }
      if (!obj.shared_with_user) {
        return res.status(404).send('Object is not shared')
      }
      obj.shared_with_user = null
      res.json(obj)
    }).catch(next)
})
