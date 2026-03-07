import { prisma } from '../prisma.js';

const toCsv = (headers, rows) => {
  const esc = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const head = headers.join(',');
  const body = rows.map((row) => headers.map((h) => esc(row[h])).join(',')).join('\n');
  return `${head}\n${body}`;
};

export const getReportData = async (type) => {
  if (type === 'rentals') {
    const data = await prisma.rental.findMany({
      include: {
        user: { select: { name: true, email: true, student_id: true } },
        physical_book: { select: { title: true } },
      },
      orderBy: { loan_date: 'desc' },
      take: 5000,
    });

    return data.map((r) => ({
      rental_id: r.id,
      student_name: r.user.name,
      student_email: r.user.email,
      student_id: r.user.student_id,
      book_title: r.physical_book.title,
      status: r.status,
      loan_date: r.loan_date.toISOString(),
      due_date: r.due_date.toISOString(),
      return_date: r.return_date ? r.return_date.toISOString() : '',
      fine: Number(r.fine ?? 0),
    }));
  }

  if (type === 'overdue') {
    const now = new Date();
    const data = await prisma.rental.findMany({
      where: /** @type {any} */ ({ status: 'BORROWED', due_date: { lt: now } }),
      include: {
        user: { select: { name: true, email: true, student_id: true } },
        physical_book: { select: { title: true } },
      },
      orderBy: { due_date: 'asc' },
      take: 5000,
    });

    return data.map((r) => {
      const days_overdue = Math.ceil((now.getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24));
      return {
        rental_id: r.id,
        student_name: r.user.name,
        student_email: r.user.email,
        student_id: r.user.student_id,
        book_title: r.physical_book.title,
        due_date: r.due_date.toISOString(),
        days_overdue,
        current_fine: Number(r.fine ?? 0),
      };
    });
  }

  if (type === 'users') {
    const data = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        student_id: true,
        year: true,
        department: true,
        is_confirmed: true,
        is_blocked: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5000,
    });

    return data.map((u) => ({
      user_id: u.id,
      name: u.name,
      email: u.email,
      student_id: u.student_id,
      year: u.year,
      department: u.department,
      is_confirmed: u.is_confirmed,
      is_blocked: u.is_blocked,
      joined_at: u.created_at.toISOString(),
    }));
  }

  if (type === 'inventory') {
    const data = await prisma.book.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        title: true,
        copies: true,
        available: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
      take: 5000,
    });

    return data.map((b) => ({
      book_id: b.id,
      title: b.title,
      author: b.author.name,
      category: b.category.name,
      total_copies: b.copies,
      available_copies: b.available,
      borrowed_copies: b.copies - b.available,
    }));
  }

  if (type === 'reservations') {
    const data = await prisma.reservation.findMany({
      include: {
        user: { select: { name: true, email: true, student_id: true } },
        book: { select: { title: true } },
      },
      orderBy: { reserved_at: 'desc' },
      take: 5000,
    });

    return data.map((r) => ({
      reservation_id: r.id,
      student_name: r.user.name,
      student_email: r.user.email,
      student_id: r.user.student_id,
      book_title: r.book.title,
      queue_position: r.queue_position,
      status: r.status,
      reserved_at: r.reserved_at.toISOString(),
      notified_at: r.notified_at ? r.notified_at.toISOString() : '',
      expires_at: r.expires_at ? r.expires_at.toISOString() : '',
    }));
  }

  throw new Error('Unsupported report type');
};

export const buildReport = async (type, format = 'json') => {
  const rows = await getReportData(type);
  if (format === 'json') return { contentType: 'application/json', body: { rows } };

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    contentType: 'text/csv',
    body: toCsv(headers, rows),
  };
};
