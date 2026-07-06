const Event = require("../models/Event");
const User = require("../models/User");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/uploadMiddleware");
const { pdfQueue } = require("../queue/pdfQueue");

// Helper to convert comma-separated string or array (including JSON string arrays) to clean array
const parseArrayField = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    const trimmed = field.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fall back to split by comma
      }
    }
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [field];
};

// Helper to parse teamSize object from req.body
const parseTeamSize = (field) => {
  if (!field) return { min: 1, max: 1 };
  if (typeof field === "object") {
    return {
      min: Number(field.min) || 1,
      max: Number(field.max) || 1
    };
  }
  try {
    const parsed = JSON.parse(field);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        min: Number(parsed.min) || 1,
        max: Number(parsed.max) || 1
      };
    }
  } catch (e) {
    // ignore
  }
  return { min: 1, max: 1 };
};

// Helper to parse schedule object from req.body
const parseSchedule = (field) => {
  if (!field) return undefined;
  if (typeof field === "object") {
    return {
      time: field.time || ""
    };
  }
  try {
    const parsed = JSON.parse(field);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        time: parsed.time || ""
      };
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

// @desc    Create a new event (with image & PDF uploads)
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    const {
      isActive,
      type,
      location,
      club,
      clubTagline,
      clubPosterUrl,
      category,
      tags,
      event,
      sport,
      tagline,
      format,
      description,
      startDate,
      endDate,
      venue,
      teamSize,
      posterUrl,
      rulebookUrl,
      registrationUrl,
      registrationOpen,
      coordinator,
      coCoordinator,
      contactMain,
      contactSub,
      schedule,
    } = req.body;

    if (!type || !description || !startDate || !endDate || !location) {
      return res.status(400).json({
        success: false,
        message: "type, description, startDate, endDate, and location are required",
      });
    }

    if (type === "Cultural Event") {
      if (!event || !club) {
        return res.status(400).json({
          success: false,
          message: "event and club are required for Cultural Events",
        });
      }
    } else if (type === "Sports Event") {
      if (!sport) {
        return res.status(400).json({
          success: false,
          message: "sport is required for Sports Events",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid event type. Must be 'Cultural Event' or 'Sports Event'",
      });
    }

    // Upload image posters to Cloudinary
    const imagePosters = [];
    if (req.files?.images) {
      for (const file of req.files.images) {
        const result = await uploadToCloudinary(file.buffer, "campus-events/posters", "image");
        imagePosters.push({ url: result.secure_url, publicId: result.public_id });
      }
    }

    // Upload PDF files to Cloudinary
    const pdfLinks = [];
    if (req.files?.pdfs) {
      for (const file of req.files.pdfs) {
        const result = await uploadToCloudinary(file.buffer, "campus-events/pdfs", "raw");
        pdfLinks.push({
          url: result.secure_url,
          publicId: result.public_id,
          name: file.originalname,
        });
      }
    }

    // Upload rulebook PDF (single file)
    let rulebookUrlVal = rulebookUrl || null;
    if (req.files?.rulebookPdf?.[0]) {
      const result = await uploadToCloudinary(req.files.rulebookPdf[0].buffer, "campus-events/pdfs", "raw");
      rulebookUrlVal = result.secure_url;
    }

    // Queue PDF indexing job if a rulebook URL is available
    const pendingRulebookUrl = rulebookUrlVal;

    // Upload icon image (single file)
    let clubPosterUrlVal = clubPosterUrl || null;
    if (req.files?.icon?.[0]) {
      const result = await uploadToCloudinary(req.files.icon[0].buffer, "campus-events/icons", "image");
      clubPosterUrlVal = result.secure_url;
    }

    // Set posterUrl
    let posterUrlVal = posterUrl || null;
    if (!posterUrlVal && imagePosters.length > 0) {
      posterUrlVal = imagePosters[0].url;
    }

    const parsedTeamSize = parseTeamSize(teamSize);
    const parsedSchedule = parseSchedule(schedule);

    const eventObj = await Event.create({
      isActive: isActive !== undefined ? String(isActive) === "true" || isActive === true : true,
      type,
      location,
      club: club || null,
      clubTagline: clubTagline || null,
      clubPosterUrl: clubPosterUrlVal,
      category: category || null,
      tags: parseArrayField(tags),
      event: event || null,
      sport: sport || null,
      tagline: tagline || null,
      format: parseArrayField(format),
      description,
      startDate,
      endDate,
      venue: venue || null,
      teamSize: parsedTeamSize,
      posterUrl: posterUrlVal,
      rulebookUrl: rulebookUrlVal,
      registrationUrl: registrationUrl || null,
      registrationOpen: registrationOpen !== undefined ? String(registrationOpen) === "true" || registrationOpen === true : false,
      coordinator: parseArrayField(coordinator),
      coCoordinator: parseArrayField(coCoordinator),
      contactMain: parseArrayField(contactMain),
      contactSub: parseArrayField(contactSub),
      schedule: parsedSchedule || undefined,
      pdfLinks,
      imagePosters,
      createdBy: req.user._id,
    });

    if (pendingRulebookUrl) {
      await pdfQueue.add('index-pdf', {
        rulebookId: eventObj._id.toString(),
        eventId: eventObj._id.toString(),
        driveLink: pendingRulebookUrl,
        uploadedBy: req.user?._id?.toString() || 'admin',
        version: 1,
      });
    }

    res.status(201).json({ success: true, message: "Event created successfully", data: eventObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all active events
// @route   GET /api/events
// @access  Public
const getAllEvents = async (req, res) => {
  try {
    // Exclude the registered array — it can be very large and is not needed in list views
    const events = await Event.find().select("-registered").lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all sports events
// @route   GET /api/events/sports
// @access  Public
const getSportsEvents = async (req, res) => {
  try {
    const events = await Event.find({ type: "Sports Event" }).select("-registered").lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all cultural events
// @route   GET /api/events/cultural
// @access  Public
const getCulturalEvents = async (req, res) => {
  try {
    const events = await Event.find({ type: "Cultural Event" }).select("-registered").lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const eventObj = await Event.findById(req.params.id)
      .populate("createdBy", "name email")
      .lean();

    if (!eventObj) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: eventObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update event details
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
  try {
    const eventObj = await Event.findById(req.params.id);
    if (!eventObj) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const {
      isActive,
      type,
      location,
      club,
      clubTagline,
      clubPosterUrl,
      category,
      tags,
      event,
      sport,
      tagline,
      format,
      description,
      startDate,
      endDate,
      venue,
      teamSize,
      posterUrl,
      rulebookUrl,
      registrationUrl,
      registrationOpen,
      coordinator,
      coCoordinator,
      contactMain,
      contactSub,
      schedule,
    } = req.body;

    // Upload any newly added images
    if (req.files?.images) {
      for (const file of req.files.images) {
        const result = await uploadToCloudinary(file.buffer, "campus-events/posters", "image");
        eventObj.imagePosters.push({ url: result.secure_url, publicId: result.public_id });
      }
    }

    // Upload any newly added PDFs
    if (req.files?.pdfs) {
      for (const file of req.files.pdfs) {
        const result = await uploadToCloudinary(file.buffer, "campus-events/pdfs", "raw");
        eventObj.pdfLinks.push({
          url: result.secure_url,
          publicId: result.public_id,
          name: file.originalname,
        });
      }
    }

    // Upload a new rulebook PDF (optional)
    if (req.files?.rulebookPdf?.[0]) {
      const result = await uploadToCloudinary(req.files.rulebookPdf[0].buffer, "campus-events/pdfs", "raw");
      eventObj.rulebookUrl = result.secure_url;
    } else if (rulebookUrl !== undefined) {
      eventObj.rulebookUrl = rulebookUrl;
    }

    // Upload a new icon (optional)
    if (req.files?.icon?.[0]) {
      const result = await uploadToCloudinary(req.files.icon[0].buffer, "campus-events/icons", "image");
      eventObj.clubPosterUrl = result.secure_url;
    } else if (clubPosterUrl !== undefined) {
      eventObj.clubPosterUrl = clubPosterUrl;
    }

    // Update fields
    if (isActive !== undefined) eventObj.isActive = String(isActive) === "true" || isActive === true;
    if (type !== undefined) eventObj.type = type;
    if (location !== undefined) eventObj.location = location;
    if (club !== undefined) eventObj.club = club;
    if (clubTagline !== undefined) eventObj.clubTagline = clubTagline;
    if (category !== undefined) eventObj.category = category;
    if (tags !== undefined) eventObj.tags = parseArrayField(tags);
    if (event !== undefined) eventObj.event = event;
    if (sport !== undefined) eventObj.sport = sport;
    if (tagline !== undefined) eventObj.tagline = tagline;
    if (format !== undefined) eventObj.format = parseArrayField(format);
    if (description !== undefined) eventObj.description = description;
    if (startDate !== undefined) eventObj.startDate = startDate;
    if (endDate !== undefined) eventObj.endDate = endDate;
    if (venue !== undefined) eventObj.venue = venue;
    if (teamSize !== undefined) eventObj.teamSize = parseTeamSize(teamSize);
    if (posterUrl !== undefined) {
      eventObj.posterUrl = posterUrl;
    } else if (req.files?.images && req.files.images.length > 0) {
      // If new images were uploaded and no posterUrl was provided, use the first new image
      eventObj.posterUrl = eventObj.imagePosters[eventObj.imagePosters.length - req.files.images.length].url;
    }
    if (registrationUrl !== undefined) eventObj.registrationUrl = registrationUrl;
    if (registrationOpen !== undefined) eventObj.registrationOpen = String(registrationOpen) === "true" || registrationOpen === true;
    if (coordinator !== undefined) eventObj.coordinator = parseArrayField(coordinator);
    if (coCoordinator !== undefined) eventObj.coCoordinator = parseArrayField(coCoordinator);
    if (contactMain !== undefined) eventObj.contactMain = parseArrayField(contactMain);
    if (contactSub !== undefined) eventObj.contactSub = parseArrayField(contactSub);
    if (schedule !== undefined) eventObj.schedule = parseSchedule(schedule);

    await eventObj.save();
    res.json({ success: true, message: "Event updated successfully", data: eventObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete event (and all Cloudinary assets)
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Remove event from all registered users
    await User.updateMany(
      { registeredEvents: event._id },
      { $pull: { registeredEvents: event._id } }
    );

    await event.deleteOne();
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a specific image from an event
// @route   DELETE /api/events/:id/images/:publicId
// @access  Private/Admin
const deleteEventImage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const publicId = decodeURIComponent(req.params.publicId);
    await deleteFromCloudinary(publicId, "image");

    event.imagePosters = event.imagePosters.filter((img) => img.publicId !== publicId);
    await event.save();

    res.json({ success: true, message: "Image deleted", data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a specific PDF from an event
// @route   DELETE /api/events/:id/pdfs/:publicId
// @access  Private/Admin
const deleteEventPdf = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const publicId = decodeURIComponent(req.params.publicId);
    await deleteFromCloudinary(publicId, "raw");

    event.pdfLinks = event.pdfLinks.filter((pdf) => pdf.publicId !== publicId);
    await event.save();

    res.json({ success: true, message: "PDF deleted", data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register logged-in user for an event
// @route   POST /api/events/:id/register
// @access  Private
const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !event.isActive) {
      return res.status(404).json({ success: false, message: "Event not found or inactive" });
    }

    const userId = req.user._id;
    const { json } = req.body;

    if (!json) {
      return res.status(400).json({ success: false, message: "Registration info (json) is required" });
    }

    // Check if already registered
    const alreadyRegistered = event.registered.some(reg => reg.userid.toString() === userId.toString());
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: "Already registered for this event" });
    }

    // Add registration to event
    event.registered.push({ json, userid: userId });
    await event.save();

    // Add event to user
    await User.findByIdAndUpdate(userId, {
      $addToSet: { registeredEvents: event._id },
    });

    res.json({ success: true, message: "Registered for event successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unregister logged-in user from an event
// @route   DELETE /api/events/:id/register
// @access  Private
const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const userId = req.user._id;

    // Check if registered
    const registrationIndex = event.registered.findIndex(reg => reg.userid.toString() === userId.toString());
    if (registrationIndex === -1) {
      return res.status(400).json({ success: false, message: "Not registered for this event" });
    }

    // Remove registration
    event.registered.splice(registrationIndex, 1);
    await event.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { registeredEvents: event._id },
    });

    res.json({ success: true, message: "Unregistered from event successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all registered users for an event (admin)
// @route   GET /api/events/:id/registrations
// @access  Private/Admin
const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select("registered")
      .populate("registered.userid", "name email year rollNumber createdAt")
      .lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.json({
      success: true,
      data: event.registered,
      count: event.registered.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload / replace a rulebook PDF for an event and queue indexing
// @route   POST /api/events/:id/rulebook
// @access  Private/Admin
const uploadRulebookHandler = async (req, res) => {
  try {
    const { rulebookId, eventId, driveLink, version } = req.body;

    const targetEventId = eventId || req.params.id;
    const eventObj = await Event.findById(targetEventId);
    if (!eventObj) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!driveLink) {
      return res.status(400).json({ success: false, message: 'driveLink is required' });
    }

    eventObj.rulebookUrl = driveLink;
    await eventObj.save();

    await pdfQueue.add('index-pdf', {
      rulebookId: rulebookId || targetEventId,
      eventId: targetEventId,
      driveLink,
      uploadedBy: req.user?._id?.toString() || 'admin',
      version: version || 1,
    });

    res.status(200).json({ message: 'Rulebook uploaded. Indexing started.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getSportsEvents,
  getCulturalEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  deleteEventImage,
  deleteEventPdf,
  registerForEvent,
  unregisterFromEvent,
  getEventRegistrations,
  uploadRulebookHandler,
};
