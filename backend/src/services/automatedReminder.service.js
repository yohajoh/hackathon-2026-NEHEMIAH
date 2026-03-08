import { prisma } from '../prisma.js';
import { createNotification, notifyAdmins } from './notification.service.js';
import { sendEmail } from './mail.service.js';

const getConfig = async () => {
  const config = await prisma.systemConfig.findFirst({ orderBy: { id: 'desc' } });
  if (!config) return null;
  return config;
};

export const sendUpcomingReturnReminders = async (io) => {
  const config = await getConfig();
  if (!config) {
    console.log('No system config found, skipping upcoming return reminders');
    return { remindersSent: 0 };
  }

  const reminderDays = config.reminder_days_before_due || 3;
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + reminderDays);

  const upcomingRentals = await prisma.rental.findMany({
    where: {
      status: 'BORROWED',
      due_date: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      physical_book: { select: { id: true, title: true } },
    },
  });

  let sent = 0;

  for (const rental of upcomingRentals) {
    const daysUntilDue = Math.ceil(
      (new Date(rental.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const existingNotification = await prisma.notification.findFirst({
      where: {
        user_id: rental.user_id,
        message: {
          contains: `"${rental.physical_book.title}" is due in ${daysUntilDue} day(s)`,
        },
        created_at: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingNotification) continue;

    const dueDateStr = new Date(rental.due_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await createNotification({
      userId: rental.user_id,
      message: `⏰ Reminder: "${rental.physical_book.title}" is due in ${daysUntilDue} day(s). Due date: ${dueDateStr}. Please return on time to avoid fines.`,
      type: 'REMINDER',
      io,
    });

    try {
      await sendEmail({
        email: rental.user.email,
        subject: `Book Return Reminder: "${rental.physical_book.title}" is due in ${daysUntilDue} day(s)`,
        message: `Dear ${rental.user.name},\n\nThis is a friendly reminder that your borrowed book "${rental.physical_book.title}" is due in ${daysUntilDue} day(s).\n\nDue Date: ${dueDateStr}\n\nPlease return the book on time to avoid late fees.\n\nBest regards,\nBirana Library`,
      });
    } catch (error) {
      console.error(`Failed to send email to ${rental.user.email}:`, error);
    }

    sent++;
  }

  return { remindersSent: sent };
};

export const sendOverdueRemindersAutomated = async (io) => {
  const config = await getConfig();
  if (!config) {
    console.log('No system config found, skipping overdue reminders');
    return { remindersSent: 0 };
  }

  const overdue = await prisma.rental.findMany({
    where: {
      status: 'BORROWED',
      due_date: { lt: new Date() },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      physical_book: { select: { id: true, title: true } },
    },
  });

  const now = new Date();
  let sent = 0;

  for (const rental of overdue) {
    const daysOverdue = Math.ceil(
      (now.getTime() - new Date(rental.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const existingNotification = await prisma.notification.findFirst({
      where: {
        user_id: rental.user_id,
        type: 'OVERDUE',
        message: {
          contains: `"${rental.physical_book.title}" is now overdue`,
        },
        created_at: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingNotification) continue;

    const estimatedFine = parseFloat((daysOverdue * Number(config.daily_fine)).toFixed(2));

    await createNotification({
      userId: rental.user_id,
      message: `🔴 OVERDUE ALERT: "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue. Estimated fine: ${estimatedFine} ETB. Please return it immediately to avoid additional fines.`,
      type: 'OVERDUE',
      io,
    });

    try {
      await sendEmail({
        email: rental.user.email,
        subject: `OVERDUE: "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue`,
        message: `Dear ${rental.user.name},\n\nYour borrowed book "${rental.physical_book.title}" is now ${daysOverdue} day(s) overdue.\n\nCurrent estimated fine: ${estimatedFine} ETB\n\nPlease return the book immediately to avoid additional fines.\n\nBest regards,\nBirana Library`,
      });
    } catch (error) {
      console.error(`Failed to send overdue email to ${rental.user.email}:`, error);
    }

    sent++;
  }

  return { remindersSent: sent };
};
