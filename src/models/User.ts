import mongoose, { Schema, Document } from 'mongoose';

export interface IAward {
  type: string;
  details: string;
}

export interface ISeat {
  section?: string | number; // S1, S2, S3, S4
  row?: string; // A-O
  column?: string | number; // 1-10
  type: 'Reserved' | 'Ground' | 'Gallery';
}

export interface IUser extends Document {
  register_no: string;
  student_name: string;
  email: string;
  phone?: string;
  school: string;
  program: string;
  branch: string;
  batch: string;
  program_code: string;
  awards: IAward[];
  rsvp_status: 'yes' | 'no' | null;
  rsvp_reason?: string;
  qr_code: string;
  checked_in: boolean;
  seating_category: 'ground' | 'gallery';
  seat?: ISeat;
  email_status: {
    sent: boolean;
    opened: boolean;
    clicked: boolean;
    sent_at?: Date;
    opened_at?: Date;
    clicked_at?: Date;
  };
}

const AwardSchema = new Schema<IAward>({
  type: { type: String, required: true },
  details: { type: String, required: true },
});

const SeatSchema = new Schema<ISeat>({
  section: { type: Schema.Types.Mixed },
  row: { type: String },
  column: { type: Schema.Types.Mixed },
  type: { type: String, enum: ['Reserved', 'Ground', 'Gallery'], default: 'Ground' },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  register_no: { type: String, required: true, unique: true },
  student_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  school: { type: String },
  program: { type: String },
  branch: { type: String },
  batch: { type: String },
  program_code: { type: String },
  awards: [AwardSchema],
  rsvp_status: { type: String, enum: ['yes', 'no', null], default: null },
  rsvp_reason: { type: String },
  qr_code: { type: String, required: true, unique: true },
  checked_in: { type: Boolean, default: false },
  seating_category: { type: String, enum: ['ground', 'gallery'], default: 'ground' },
  seat: SeatSchema,
  email_status: {
    sent: { type: Boolean, default: false },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false },
    sent_at: { type: Date },
    opened_at: { type: Date },
    clicked_at: { type: Date },
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
