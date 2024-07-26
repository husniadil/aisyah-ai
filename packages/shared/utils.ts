export const extractAudioLink = (text?: string): string | undefined => {
  const audioLinkRegex = /\/\/\S+\.(mp3|wav|ogg)/g;
  const match = text?.match(audioLinkRegex);
  return match ? `https:${match[0]}` : undefined;
};

export const extractPhotoLink = (text?: string): string | undefined => {
  const photoLinkRegex = /\/\/\S+\.(jpg|png|gif)/g;
  const match = text?.match(photoLinkRegex);
  return match ? `https:${match[0].replace("https:", "")}` : undefined;
};
