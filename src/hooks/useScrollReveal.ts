import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollReveal() {
  const location = useLocation()

  // ページ遷移時にトップへスクロール
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // スクロールリビールアニメーション
  useEffect(() => {
    // 少し遅延させてDOM更新後に確実に要素を取得
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('active')
            }
          })
        },
        { threshold: 0.1 }
      )

      const elements = document.querySelectorAll('.reveal')
      elements.forEach((el) => observer.observe(el))

      return () => observer.disconnect()
    }, 50)

    return () => clearTimeout(timer)
  }, [location.pathname])
}
