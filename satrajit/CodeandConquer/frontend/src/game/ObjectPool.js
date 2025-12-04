export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 50) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.available = []
    this.inUse = []
    this.totalCreated = 0
    
    // Pre-create initial pool
    for (let i = 0; i < initialSize; i++) {
      const obj = createFn()
      this.available.push(obj)
      this.totalCreated++
    }
  }
  
  acquire() {
    let obj
    if (this.available.length === 0) {
      // Create new object if pool exhausted
      obj = this.createFn()
      this.totalCreated++
    } else {
      obj = this.available.pop()
    }
    
    this.inUse.push(obj)
    return obj
  }
  
  release(obj) {
    const index = this.inUse.indexOf(obj)
    if (index > -1) {
      this.inUse.splice(index, 1)
      this.resetFn(obj)
      this.available.push(obj)
      return true
    }
    return false
  }
  
  releaseAll() {
    this.inUse.forEach(obj => {
      this.resetFn(obj)
      this.available.push(obj)
    })
    this.inUse = []
  }
  
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.length,
      totalCreated: this.totalCreated
    }
  }
  
  clear() {
    this.available = []
    this.inUse = []
    this.totalCreated = 0
  }
}

