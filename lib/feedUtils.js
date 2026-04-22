// lib/feedUtils.js
// Smart bento sizing based on post content

// Assign bento size based on whether post has an image and content length
export function getSmartBentoSize(post, index) {
  const hasImage  = !!post?.image_url
  const textLen   = post?.content?.length || 0

  if (hasImage) {
    // Image posts: alternate between large and medium
    return index % 3 === 0 ? 'large' : 'medium'
  }

  if (textLen > 280) return 'medium'
  return 'small'
}

// For the bento grid when we don't have post data (skeleton)
export function getSkeletonSize(index) {
  const pattern = ['large', 'small', 'small', 'medium', 'medium', 'small']
  return pattern[index % pattern.length]
}
