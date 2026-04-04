export const SECTIONS = ['S1', 'S2', 'S3', 'S4'] as const;
export const ROWS = 'ABCDEFGHIJKLMNO'.split('');
export const COLS = Array.from({ length: 10 }, (_, index) => index + 1);

export interface AwardLike {
  type: string;
  details: string;
}

export interface SeatLike {
  section?: string | number;
  row?: string;
  column?: string | number;
  type: 'Reserved' | 'Ground' | 'Gallery';
}

export interface StudentSeatLike {
  register_no: string;
  student_name?: string;
  school?: string;
  branch?: string;
  awards: AwardLike[];
  seat?: SeatLike;
  checked_in?: boolean;
  rsvp_status?: 'yes' | 'no' | null;
}

export interface SeatCellStudent {
  register_no: string;
  student_name: string;
  school?: string;
  branch?: string;
  awards: AwardLike[];
  checked_in: boolean;
  rsvp_status?: 'yes' | 'no' | null;
}

export interface SeatCell {
  key: string;
  section: string;
  row: string;
  column: number;
  student: SeatCellStudent | null;
  state: 'empty' | 'reserved' | 'checked_in' | 'rsvp_yes' | 'rsvp_no';
}

export interface SectionGrid {
  section: string;
  rows: Array<{
    row: string;
    seats: SeatCell[];
  }>;
}

function normalize(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase();
}

function awardText(student: StudentSeatLike): string {
  return student.awards
    .flatMap((award) => [normalize(award.type), normalize(award.details)])
    .join(' ');
}

function hasKeyword(student: StudentSeatLike, keywords: string[]): boolean {
  const text = awardText(student);
  return keywords.some((keyword) => text.includes(keyword));
}

function seatKey(section: string, row: string, column: number): string {
  return `${section}-${row}${column}`;
}

function assignSeat(student: StudentSeatLike, section: string, row: string, column: number) {
  student.seat = {
    section,
    row,
    column,
    type: 'Ground',
  };
}

function buildSeatRange(
  startSection: string,
  startRow: string,
  sections: string[]
): Array<{ section: string; row: string; column: number }> {
  const startSectionIndex = sections.indexOf(startSection);
  const startRowIndex = ROWS.indexOf(startRow);
  const seats: Array<{ section: string; row: string; column: number }> = [];

  for (let sectionIndex = startSectionIndex; sectionIndex < sections.length; sectionIndex += 1) {
    const rowStart = sectionIndex === startSectionIndex ? startRowIndex : 0;
    for (let rowIndex = rowStart; rowIndex < ROWS.length; rowIndex += 1) {
      for (const column of COLS) {
        seats.push({
          section: sections[sectionIndex],
          row: ROWS[rowIndex],
          column,
        });
      }
    }
  }

  return seats;
}

function takeSeats(
  pool: Array<{ section: string; row: string; column: number }>,
  count: number
) {
  return pool.splice(0, Math.max(0, count));
}

function assignSequential(
  students: StudentSeatLike[],
  primarySeats: Array<{ section: string; row: string; column: number }>,
  overflowSeats: Array<{ section: string; row: string; column: number }> = []
) {
  students.forEach((student) => {
    const nextSeat = primarySeats.shift() || overflowSeats.shift();
    if (nextSeat) {
      assignSeat(student, nextSeat.section, nextSeat.row, nextSeat.column);
    }
  });
}

function orderedClubRows(students: StudentSeatLike[]) {
  const preferredNames = [
    'best arts and cultural',
    'best literary club',
    'best social and outreach club',
    'best tech club',
    'best health and wellness club',
    'best recreational club',
    'best chapter',
    'elite club award 1',
    'elite club award 2',
  ];

  const groups = new Map<string, StudentSeatLike[]>();
  const order: string[] = [];

  for (const student of students) {
    const details = student.awards.map((award) => normalize(award.details));
    const typeValues = student.awards.map((award) => normalize(award.type));

    const groupName =
      preferredNames.find((name) => details.some((detail) => detail.includes(name))) ||
      details.find((detail) => detail.includes('club')) ||
      typeValues.find((type) => type.includes('club')) ||
      'club';

    if (!groups.has(groupName)) {
      groups.set(groupName, []);
      order.push(groupName);
    }

    groups.get(groupName)?.push(student);
  }

  const orderedPreferred = preferredNames.filter((name) => groups.has(name));
  const remaining = order.filter((name) => !preferredNames.includes(name));
  return [...orderedPreferred, ...remaining].map((groupName) => ({
    groupName,
    students: groups.get(groupName) || [],
  }));
}

export function assignGroundSeats<T extends StudentSeatLike>(students: T[]): T[] {
  const bogsStudents: T[] = [];
  const clubStudents: T[] = [];
  const meritStudents: T[] = [];
  const attendanceStudents: T[] = [];
  const regularStudents: T[] = [];

  students.forEach((student) => {
    if (hasKeyword(student, ['bogs'])) {
      bogsStudents.push(student);
      return;
    }

    if (hasKeyword(student, ['club', 'arts and cultural', 'literary club', 'elite club'])) {
      clubStudents.push(student);
      return;
    }

    if (hasKeyword(student, ['merit'])) {
      meritStudents.push(student);
      return;
    }

    if (hasKeyword(student, ['100 percent', '100%', 'attendance'])) {
      attendanceStudents.push(student);
      return;
    }

    regularStudents.push(student);
  });

  bogsStudents.forEach((student, index) => {
    if (index < 10) {
      assignSeat(student, 'S1', 'A', COLS[index]);
    }
  });

  const flow = buildSeatRange('S1', 'B', ['S1', 'S2', 'S3']);
  
  // 1. Merit Students
  const meritPrimary = takeSeats(flow, meritStudents.length);
  assignSequential(meritStudents, meritPrimary);

  // 2. Attendance Students (Immediately after Merit, no fixed size block)
  const attendancePrimary = takeSeats(flow, attendanceStudents.length);
  assignSequential(attendanceStudents, attendancePrimary);

  // 3. Regular Students (Starting from whatever is left)
  assignSequential(regularStudents, flow);

  const remainingRows = [...ROWS];
  const clubGroups = orderedClubRows(clubStudents);

  let nextClubRowIndex = 0;
  clubGroups.forEach(({ students: groupStudents }) => {
    let rowIndex = nextClubRowIndex;
    let columnIndex = 0;

    groupStudents.forEach((student) => {
      while (rowIndex < remainingRows.length) {
        const row = remainingRows[rowIndex];
        const column = COLS[columnIndex];

        assignSeat(student, 'S4', row, column);
        columnIndex += 1;

        if (columnIndex >= COLS.length) {
          columnIndex = 0;
          rowIndex += 1;
        }
        return;
      }
    });

    nextClubRowIndex = rowIndex + (columnIndex > 0 ? 1 : 0);
  });

  return students;
}

export function assignClubSeats<T extends StudentSeatLike>(students: T[]): T[] {
  const clubGroups = orderedClubRows(students);
  const remainingRows = [...ROWS];

  let nextClubRowIndex = 0;
  clubGroups.forEach(({ students: groupStudents }) => {
    let rowIndex = nextClubRowIndex;
    let columnIndex = 0;

    groupStudents.forEach((student) => {
      while (rowIndex < remainingRows.length) {
        const row = remainingRows[rowIndex];
        const column = COLS[columnIndex];

        assignSeat(student, 'S4', row, column);
        columnIndex += 1;

        if (columnIndex >= COLS.length) {
          columnIndex = 0;
          rowIndex += 1;
        }
        return;
      }
    });

    nextClubRowIndex = rowIndex + (columnIndex > 0 ? 1 : 0);
  });

  return students;
}

function buildSeatState(student: StudentSeatLike | null): SeatCell['state'] {
  if (!student) return 'empty';
  if (student.checked_in) return 'checked_in';
  if (student.rsvp_status === 'yes') return 'rsvp_yes';
  if (student.rsvp_status === 'no') return 'rsvp_no';
  return 'reserved';
}

export function buildSectionGrid<T extends StudentSeatLike>(
  students: T[],
  section: string
): SectionGrid {
  const seatMap = new Map<string, T>();

  students.forEach((student) => {
    const seatSection = student.seat?.section;
    const seatRow = student.seat?.row;
    const seatColumn = student.seat?.column;

    if (
      typeof seatSection === 'string' &&
      seatSection === section &&
      typeof seatRow === 'string' &&
      typeof seatColumn === 'number'
    ) {
      seatMap.set(seatKey(section, seatRow, seatColumn), student);
    }
  });

  return {
    section,
    rows: ROWS.map((row) => ({
      row,
      seats: COLS.map((column) => {
        const key = seatKey(section, row, column);
        const student = seatMap.get(key) || null;

        return {
          key,
          section,
          row,
          column,
          student: student
            ? {
                register_no: student.register_no,
                student_name: student.student_name || '',
                school: student.school,
                branch: student.branch,
                awards: student.awards,
                checked_in: Boolean(student.checked_in),
                rsvp_status: student.rsvp_status,
              }
            : null,
          state: buildSeatState(student),
        };
      }),
    })),
  };
}

export function buildFullSeatGrid<T extends StudentSeatLike>(students: T[]) {
  return SECTIONS.map((section) => buildSectionGrid(students, section));
}
