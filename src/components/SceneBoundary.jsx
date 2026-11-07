'use client'

import { Component } from 'react'

// If anything in the 3D scene fails (a dropped asset request, a lost GPU
// context during startup), keep the page alive and fall back to the posters
// instead of letting the error take the whole site down.
export default class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
