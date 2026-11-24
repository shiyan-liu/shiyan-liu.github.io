export type AnniversaryPhoto = {
  src: string;
  takenAt: string;
  alt: string;
  caption?: string;
};

// Keep the photo's original local date and time in ISO format, including the offset when known.
export const anniversaryPhotos: readonly AnniversaryPhoto[] = [];
