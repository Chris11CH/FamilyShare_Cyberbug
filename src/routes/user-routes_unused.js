/*
router.post('/authenticate/google', async (req, res, next) => {
  const { deviceToken, language, origin, response } = req.body
  const { user: googleProfile, idToken: googleToken } = response
  try {
    const user = await User.findOne({ email: googleProfile.email })
    if (user) {
      if (deviceToken !== undefined && deviceToken !== 'undefined' && deviceToken !== null) {
        const device = await Device.findOne({ device_id: deviceToken })
        if (device) {
          device.user_id = user.user_id
          await device.save()
        } else {
          await Device.create({
            user_id: user.user_id,
            device_id: deviceToken
          })
        }
      }
      const profile = await Profile.findOne({ user_id: user.user_id }).populate('image').lean().exec()
      if (profile.suspended) {
        await Profile.updateOne({ user_id: user.user_id }, { suspended: false })
        const usersChildren = await Parent.find({ parent_id: user.user_id })
        const childIds = usersChildren.map(usersChildren.child_id)
        await Child.updateMany({ child_id: { $in: childIds } }, { suspended: false })
      }
      const token = jwt.sign({ user_id: user.user_id, email: googleProfile.email }, process.env.SERVER_SECRET)
      const response = {
        id: profile.user_id,
        email: profile.email,
        name: `${profile.given_name} ${profile.family_name}`,
        image: profile.image.path,
        token,
        role: user.role,
        google_token: googleToken,
        origin
      }
      user.last_login = new Date()
      user.language = language
      user.token = token
      user.auth0_token = googleToken
      if (origin === 'native') {
        user.version = req.body.version
      } else {
        user.version = 'latest'
      }
      await user.save()
      res.json(response)
    } else {
      if (!(googleProfile.email && googleProfile.givenName && googleProfile.familyName && googleProfile.photo)) {
        return res.status(400).send('Bad request')
      }
      const user_id = objectid()
      if (deviceToken !== undefined && deviceToken !== null) {
        const device = await Device.findOne({ device_id: deviceToken })
        if (device) {
          device.user_id = user_id
          await device.save()
        } else {
          await Device.create({
            user_id,
            device_id: deviceToken
          })
        }
      }
      const address_id = objectid()
      const image_id = objectid()
      const token = jwt.sign({ user_id, email: googleProfile.email }, process.env.SERVER_SECRET)
      const user = {
        user_id,
        provider: 'google',
        email: googleProfile.email,
        role: 'parent',
        token,
        auth0_token: googleToken,
        language,
        last_login: new Date(),
        version: origin === 'native' ? req.body.version : 'latest'
      }
      const profile = {
        given_name: googleProfile.givenName,
        family_name: googleProfile.familyName,
        user_id,
        email: googleProfile.email,
        phone: '',
        phone_type: 'mobile',
        visible: true,
        image_id,
        address_id,
        suspended: false,
        description: ''
      }
      const image = {
        image_id,
        owner_type: 'user',
        owner_id: user_id,
        path: googleProfile.photo,
        thumbnail_path: googleProfile.photo
      }
      const address = {
        address_id,
        street: '',
        number: '',
        city: ''
      }
      const rating = {
        user_id,
        rating: 0
      }
      await User.create(user)
      await Profile.create(profile)
      await Image.create(image)
      await Address.create(address)
      await Rating.create(rating)
      res.json({
        id: user_id,
        token,
        google_token: googleToken,
        origin,
        email: googleProfile.email,
        name: `${googleProfile.givenName} ${googleProfile.familyName}`,
        image: googleProfile.photo
      })
    }
  } catch (err) {
    next(err)
  }
})
*/
/*
router.delete('/:id', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  try {
    await User.deleteOne({ user_id })
    await Password_Reset.deleteOne({ user_id })
    const profile = await Profile.findOne({ user_id })
    await Address.deleteOne({ address_id: profile.address_id })
    await Image.deleteOne({ image_id: profile.image_id })
    await Profile.deleteOne({ user_id })
    const childDeleteIds = []
    const parents = await Parent.find({})
    const usersChildren = parents.filter(parent => parent.parent_id === user_id)
    usersChildren.forEach(child => {
      if (parents.filter(parent => parent.child_id === child.child_id).length === 1) {
        childDeleteIds.push(child.child_id)
      }
    })
    await Parent.deleteMany({ parent_id: user_id })
    await Child.deleteMany({ child_id: { $in: childDeleteIds } })
    await Image.deleteMany({ owner_id: { $in: childDeleteIds } })
    // await Framily.deleteMany({ user_id});
    // await Framily.deleteMany({ framily_id: user_id });
    const announcements = await Announcement.find({ user_id })
    const announcementIds = announcements.map(announcement => announcement.announcement_id)
    await Image.deleteMany({ owner_id: { $in: announcementIds } })
    await Announcement.deleteMany({ user_id })
    await Reply.deleteMany({ user_id })
    const memberships = await Member.find({ user_id, group_accepted: true, user_accepted: true })
    const groupIds = memberships.map(membership => membership.group_id)
    const groups = await Group.find({ group_id: { $in: groupIds } })
    await Promise.all(groups.map(async (group) => {
      const response = await calendar.events.list({ calendarId: group.calendar_id })
      const groupEvents = response.data.items
      await Promise.all(groupEvents.map(async (event) => {
        const parentParticipants = JSON.parse(event.extendedProperties.shared.parents)
        const childParticipants = JSON.parse(event.extendedProperties.shared.children)
        const filteredParents = parentParticipants.filter(id => id !== user_id)
        const filteredChildren = childParticipants.filter(id => childDeleteIds.indexOf(id) === -1)
        if (filteredParents.length !== parentParticipants.length || filteredChildren.length !== childParticipants.length) {
          const timeslotPatch = {
            extendedProperties: {
              shared: {
                parents: JSON.stringify(filteredParents),
                children: JSON.stringify(filteredChildren)
              }
            }
          }
          await calendar.events.patch({ calendarId: group.calendar_id, eventId: event.id, resource: timeslotPatch })
        }
      }))
    }))
    await Member.deleteMany({ user_id })
    res.status(200).send('account deleted')
  } catch (error) {
    next(error)
  }
})
*/

/*
router.post('/:id/requestlink', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  try {
    const { link } = req.body
    console.log(link)
    const mailOptions = {
      from: process.env.SERVER_MAIL,
      to: req.email,
      subject: 'Families Share Platform Link',
      html: rl.newEmail(link)
    }
    await transporter.sendMail(mailOptions)

    res.status(200).send('Email sent successfully')
  } catch (error) {
    next(error)
  }
})

router.post('/:id/suspend', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  try {
    const usersChildren = await Parent.find({ parent_id: user_id }).lean()
    const childIds = usersChildren.map(child => child.child_id)
    await Profile.updateOne({ user_id }, { suspended: true })
    await Child.updateMany({ child_id: { $in: childIds } }, { suspended: true })
    res.status(200).send('Profile suspended successfully')
  } catch (error) {
    next(error)
  }
})

router.get('/:id/rating', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  Rating.findOne({ user_id: req.params.id }).then(rating => {
    res.json(rating)
  }).catch(next)
})

router.patch('/:id/rating', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  if (!req.body.rating) {
    return res.status(400).send('Bad Request')
  }
  Rating.updateOne({ user_id: req.params.id }, { rating: req.body.rating }).then(() => {
    res.status(200).send('Rating updated')
  }).catch(next)
})
*/
/*
router.post('/:id/walkthrough', async (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Not authenticated') }
  try {
    const { user_id, email } = req
    const profile = await Profile.findOne({ user_id })
    const mailOptions = {
      from: process.env.SERVER_MAIL,
      to: email,
      subject: 'Platform walkthrough',
      html: wt.newWalkthroughEmail(profile.given_name),
      attachments: [
        {
          filename: 'Families_Share_Walkthrough.pdf',
          path: path.join(__dirname, '../../Families_Share_Walkthrough.pdf')
        }

      ]
    }
    await transporter.sendMail(mailOptions)
    res.status(200).send('Walkthrough was sent successfully')
  } catch (error) {
    next(error)
  }
})
*/
/*
router.post('/:id/export', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const { user_id, email } = req
  try {
    const profile = await Profile.findOne({ user_id }).populate('address').populate('image').lean().exec()
    const usersGroups = await Member.find({ user_id, user_accepted: true, group_accepted: true })
    const groups = await Group.find({ group_id: { $in: usersGroups.map(group => group.group_id) } })
    const usersChildren = await Parent.find({ parent_id: user_id })
    const childIds = usersChildren.map(child => child.child_id)
    const children = await Child.find({ child_id: { $in: childIds } }).populate('image').lean().exec()
    const responses = await Promise.all(groups.map(group => uh.getUsersGroupEvents(group.calendar_id, user_id, childIds)))
    const events = [].concat(...responses)
    uh.createPdf(profile, groups, children, events, () => {
      const mailOptions = {
        from: process.env.SERVER_MAIL,
        to: email,
        subject: `${profile.given_name} ${profile.family_name} Families Share Data`,
        html: uh.newExportEmail(profile.given_name),
        attachments: [
          {
            filename: `${profile.given_name.toUpperCase()}_${profile.family_name.toUpperCase()}.pdf`,
            path: path.join(__dirname, `../../${profile.given_name.toUpperCase()}_${profile.family_name.toUpperCase()}.pdf`)
          }
        ]
      }
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) next(err)
        fr('../', { files: `${profile.given_name.toUpperCase()}_${profile.family_name.toUpperCase()}.pdf` })
      })
      res.status(200).send('Exported data successfully')
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id/events', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  try {
    const user_id = req.params.id
    const usersGroups = await Member.find({ user_id, user_accepted: true, group_accepted: true })
    const groups = await Group.find({ group_id: { $in: usersGroups.map(group => group.group_id) } })
    const children = await Parent.find({ parent_id: user_id })
    const childIds = children.map(parent => parent.child_id)
    const responses = await Promise.all(groups.map(group => uh.getUsersGroupEvents(group.calendar_id, user_id, childIds)))
    const events = [].concat(...responses)
    if (events.length === 0) {
      return res.status(404).send("User's calendar has no events")
    }
    res.status(200).json(events)
  } catch (error) {
    next(error)
  }
})
*/
/*
router.get('/:id/notifications', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  const page = req.query.page
  try {
    const user = await User.findOne({ user_id })
    const notifications = await Notification.find({ owner_id: user_id })
      .sort({ createdAt: -1 })
      .skip(page * 10)
      .limit(10)
      .lean()
    if (notifications.length === 0) {
      return res.status(404).send('User has no notifications')
    }
    notifications.forEach(notification => {
      notification.header = texts[user.language][notification.type][notification.code].header
      notification.description = nh.getNotificationDescription(notification, user.language)
    })
    return res.json(notifications)
  } catch (error) {
    next(error)
  }
})

router.get('/:id/notifications/unread', async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  Notification.find({ owner_id: user_id, read: false }).then(unreadNotifications => {
    if (unreadNotifications.length === 0) {
      return res.status(404).send('User has no notifications')
    }
    return res.status(200).send({ unreadNotifications: unreadNotifications.length })
  }).catch(next)
})

router.patch('/:id/notifications', (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.id
  Notification.updateMany({ owner_id: user_id, read: false }, { read: true }).then(() => {
    res.status(200).send('Notifications updated')
  }).catch(next)
})

router.get('/:id/framily', (req, res) => {
  // if (!req.user_id ) return res.status(401).send('Unauthorized')
  // const id = req.params.id
  // Framily.find( {user_id: id} , (error, framily) => {
  //     if (error) {
  //         res.status(400).send("Something went wrong")
  //     }
  //     if (framily.length>0) {
  //         return res.json(framily);
  //     } else {
  //         res.status(404).send("User has no framily members");
  //     }
  // })
})

router.post('/:id/framily', (req, res) => {
  // if (req.user_id !== req.params.id) return res.status(401).send('Unauthorized')
  // const user_id = req.params.id;
  // const inviteIds = req.body.inviteIds;
  // const framilyMembers = [];
  // Framily.find({ user_id: user_id }, (error, members) => {
  //     if (error) res.status(400).send("Something went wrong");
  //     inviteIds.forEach(inviteId => {
  //         if (members.filter(member => member.framily_id === inviteId).length === 0) {
  //             framilyMembers.push({
  //                 framily_id: inviteId,
  //                 user_id: user_id
  //             })
  //             framilyMembers.push({
  //                 framily_id: user_id,
  //                 user_id: inviteId,
  //             })

  //         }
  //     })
  //     Framily.create(framilyMembers)
  //     res.status(200).send("Framily members added")
  // })
})

router.get('/:id/children', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const { id } = req.params
  Parent.find({ parent_id: id }).then(children => {
    if (children.length === 0) {
      return res.status(404).send('User has no children')
    }
    res.json(children)
  }).catch(next)
})

router.post('/:id/children', childProfileUpload.single('photo'), async (req, res, next) => {
  if (req.user_id !== req.params.id) { return res.status(401).send('Unauthorized') }
  const {
    birthdate, given_name, family_name, gender, allergies, other_info, special_needs, background, image: imagePath
  } = req.body
  const { file } = req
  if (!(birthdate && given_name && family_name && gender && background)) {
    return res.status(400).send('Bad Request')
  }
  const parent_id = req.params.id
  const child = {
    birthdate,
    given_name,
    family_name,
    gender,
    allergies,
    other_info,
    special_needs,
    background,
    suspended: false
  }
  const image_id = objectid()
  const child_id = objectid()
  const image = {
    image_id,
    owner_type: 'child',
    owner_id: child_id
  }
  if (file) {
    const fileName = file.filename.split('.')
    image.path = `/images/profiles/${file.filename}`
    image.thumbnail_path = `/images/profiles/${fileName[0]}_t.${fileName[1]}`
    await sharp(path.join(__dirname, `../../images/profiles/${file.filename}`))
      .resize({
        height: 200,
        fit: sharp.fit.cover
      })
      .toFile(path.join(__dirname, `../../images/profiles/${fileName[0]}_t.${fileName[1]}`))
  } else {
    image.path = imagePath
    image.thumbnail_path = imagePath
  }
  child.child_id = child_id
  child.image_id = image_id
  const parent = {
    parent_id,
    child_id
  }
  try {
    await Image.create(image)
    await Child.create(child)
    await Parent.create(parent)
    res.status(200).send('Child created')
  } catch (error) {
    next(error)
  }
})

router.get('/:userId/children/:childId', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const child_id = req.params.childId
  Child.findOne({ child_id })
    .populate('image')
    .lean()
    .exec()
    .then(child => {
      if (!child) {
        return res.status(404).send('Child not found')
      }
      res.json(child)
    }).catch(next)
})

router.patch('/:userId/children/:childId', childProfileUpload.single('photo'), async (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  const { file } = req
  const child_id = req.params.childId
  const {
    given_name, family_name, gender, birthdate, background, allergies, other_info, special_needs
  } = req.body
  const childPatch = {
    ...req.body
  }
  if (!(given_name || family_name || gender || birthdate || background || allergies || other_info || special_needs)) {
    return res.status(400).send('Bad Request')
  }
  try {
    await Child.updateOne({ child_id }, childPatch)
    if (file) {
      const fileName = file.filename.split('.')
      const imagePatch = {
        path: `/images/profiles/${file.filename}`,
        thumbnail_path: `/images/profiles/${fileName[0]}_t.${fileName[1]}`
      }
      await sharp(path.join(__dirname, `../../images/profiles/${file.filename}`))
        .resize({
          height: 200,
          fit: sharp.fit.cover
        })
        .toFile(path.join(__dirname, `../../images/profiles/${fileName[0]}_t.${fileName[1]}`))
      await Image.updateOne({ owner_type: 'child', owner_id: child_id }, imagePatch)
    }
    res.status(200).send(' Child Profile Updated')
  } catch (error) {
    next(error)
  }
})

router.delete('/:userId/children/:childId', async (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  const user_id = req.params.userId
  const child_id = req.params.childId
  try {
    const memberships = await Member.find({ user_id })
    const groupIds = memberships.map(membership => membership.group_id)
    const userGroups = await Group.find({ group_id: { $in: groupIds } })
    await Promise.all(userGroups.map((group) => { uh.unsubcribeChildFromGroupEvents(group.calendar_id, child_id) }))
    await Child.deleteOne({ child_id })
    await Parent.deleteMany({ child_id })
    await Image.deleteOne({ owner_id: child_id })
    res.status(200).send('Child deleted')
  } catch (error) {
    next(error)
  }
})

router.get('/:userId/children/:childId/parents', (req, res, next) => {
  if (!req.user_id) { return res.status(401).send('Unauthorized') }
  const child_id = req.params.childId
  Parent.find({ child_id }).then(parents => {
    if (parents.length === 0) {
      res.status(404).send('Parents not found')
    }
    const parentIds = parents.map(parent => parent.parent_id)
    return Profile.find({ user_id: { $in: parentIds } })
  }).then(parentProfiles => {
    res.json(parentProfiles)
  }).catch(next)
})

router.post('/:userId/children/:childId/parents', (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  const { parentId } = req.body
  const child_id = req.params.childId
  Parent.find({ child_id }).then(parents => {
    if (parents.length >= 2 || !parentId) {
      return res.status(400).send('Bad Request')
    }
    return Parent.create({
      parent_id: parentId,
      child_id
    }).then(() => {
      res.status(200).send('Parent added')
    })
  }).catch(next)
})

router.delete('/:userId/children/:childId/parents/:parentId', (req, res, next) => {
  if (req.user_id !== req.params.userId) { return res.status(401).send('Unauthorized') }
  const { parentId } = req.params
  const child_id = req.params.childId
  Parent.deleteOne({ child_id, parent_id: parentId }).then(() => {
    res.status(200).send('Parent deleted')
  }).catch(next)
})

router.post('/:userId/sendmenotification', async (req, res, next) => {
  try {
    const devices = await Device.find({ user_id: req.params.userId })
    console.log(devices)
    if (devices.length === 0) {
      return res.status(404).send('User has no registered devices')
    }
    const messages = []
    const invalidTokens = []
    devices.forEach((device) => {
      if (Expo.isExpoPushToken(device.device_id)) {
        messages.push({
          to: device.device_id,
          sound: 'default',
          title: 'Welcome',
          body: 'Families Share welcomes you to our community',
          data: { url: `${process.env.CITYLAB_URI}/myfamiliesshare` }
        })
      } else {
        invalidTokens.push(device.device_id)
      }
    })
    let chunks = expo.chunkPushNotifications(messages)
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      ticketChunk.forEach((ticket, index) => {
        if (ticket.status === 'error') invalidTokens.push(chunk[index].to)
      })
    }
    await Device.deleteMany({ device_id: { $in: invalidTokens } })
    res.status(200).send('Push notification sent')
  } catch (err) {
    next(err)
  }
})
*/
