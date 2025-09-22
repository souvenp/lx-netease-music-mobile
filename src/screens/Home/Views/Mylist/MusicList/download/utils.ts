export function getFileExtension(quality: LX.Quality) {
  switch (quality) {
    case '128k':
    case '320k':
      return 'mp3'
    default:
      return 'flac'
  }
}

export function getFileExtensionFromUrl(url: string) {
  const match = url.match(/\.([0-9a-z]+)(?=[?#]|$)/i)
  return match ? match[1] : 'jpg'
}
