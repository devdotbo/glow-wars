import { useEffect, useState } from 'react'

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  
  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search)
    const demoParam = params.get('demo')
    
    setIsDemoMode(demoParam === 'true')
  }, [])
  
  return isDemoMode
}