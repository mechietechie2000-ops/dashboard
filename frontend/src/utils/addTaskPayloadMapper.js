// Converts the payload AddTaskForm builds (category/title/date/time/
// description/relatedPerson/reminder{value,unit}/details{...}) into the
// flat row shape expected by each tasks_* table's columns (see
// backend/db/task_categories_schema.sql and backend/db/sectionConfig.js).
//
// sectionRepository.insertRecord/backend sectionRepository.insertRecord
// only sends columns that are declared for that sectionKey, so extra keys
// here are harmless — but keeping this mapping explicit makes it obvious
// which form field lands in which column.

export function mapTaskPayloadToRow(payload) {
  const { title, date, time, description, relatedPerson, reminder, details = {} } = payload;

  const common = {
    title,
    related_person: relatedPerson || undefined,
    description: description || undefined,
  };

  if (reminder) {
    common.reminder_value = reminder.value;
    common.reminder_unit = reminder.unit;
  }

  if (payload.category === "vacation") {
    return {
      ...common,
      destination: details.destination,
      start_date: details.startDate,
      end_date: details.endDate,
    };
  }

  common.task_date = date || undefined;
  common.task_time = time || undefined;

  switch (payload.category) {
    case "birthday":
      return {
        ...common,
        repeat_frequency: details.repeatFrequency,
      };

    case "anniversary":
      return {
        ...common,
        anniversary_type: details.anniversaryType,
        repeat_frequency: details.repeatFrequency,
      };

    case "appointment":
      return {
        ...common,
        provider: details.provider,
        location_or_url: details.locationOrUrl,
        duration_minutes: details.durationMinutes,
      };

    case "homeMaintenance":
      return {
        ...common,
        area: details.area,
        service_provider: details.serviceProvider,
        repeat_frequency: details.repeatFrequency,
      };

    case "kids":
      return {
        ...common,
        child_name: details.childName,
        kid_task_type: details.type,
        location: details.location,
      };

    case "banking":
      return {
        ...common,
        institution: details.institution,
        account_nickname: details.accountNickname,
        amount: details.amount,
        repeat_frequency: details.repeatFrequency,
      };

    case "investment":
      return {
        ...common,
        institution: details.institution,
        action: details.action,
        amount: details.amount,
      };

    case "learning":
      return {
        ...common,
        course_or_subject: details.courseOrSubject,
        resource_url: details.resourceUrl,
        estimated_duration_minutes: details.estimatedDurationMinutes,
      };

    default:
      return common;
  }
}
