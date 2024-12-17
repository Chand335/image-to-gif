class TouchControls {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            dragThreshold: 10,
            minSwipeDistance: 50,
            ...options
        };
        
        this.items = [];
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.draggedItem = null;
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.currentX = this.startX;
        this.currentY = this.startY;
        
        const target = touch.target.closest('.draggable-item');
        if (target) {
            this.draggedItem = target;
            this.draggedItem.style.transition = 'none';
            this.draggedItem.style.zIndex = '1000';
            
            // Get initial positions of all items
            this.items = Array.from(this.container.querySelectorAll('.draggable-item'))
                .map(item => ({
                    element: item,
                    startRect: item.getBoundingClientRect()
                }));
        }
    }
    
    handleTouchMove(e) {
        if (!this.draggedItem || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.currentX = touch.clientX;
        this.currentY = touch.clientY;
        
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        
        // Start dragging if threshold is met
        if (!this.isDragging && 
            (Math.abs(deltaX) > this.options.dragThreshold || 
             Math.abs(deltaY) > this.options.dragThreshold)) {
            this.isDragging = true;
            this.draggedItem.classList.add('dragging');
        }
        
        if (this.isDragging) {
            e.preventDefault();
            
            // Move the dragged item
            this.draggedItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            
            // Find potential drop target
            const draggedRect = this.draggedItem.getBoundingClientRect();
            const draggedCenter = {
                x: draggedRect.left + draggedRect.width / 2,
                y: draggedRect.top + draggedRect.height / 2
            };
            
            // Reorder items if necessary
            this.items.forEach(item => {
                if (item.element === this.draggedItem) return;
                
                const rect = item.startRect;
                if (draggedCenter.x > rect.left && 
                    draggedCenter.x < rect.right && 
                    draggedCenter.y > rect.top && 
                    draggedCenter.y < rect.bottom) {
                    
                    this.reorderItems(this.draggedItem, item.element);
                }
            });
        }
    }
    
    handleTouchEnd() {
        if (!this.draggedItem) return;
        
        this.draggedItem.style.transition = '';
        this.draggedItem.style.transform = '';
        this.draggedItem.style.zIndex = '';
        this.draggedItem.classList.remove('dragging');
        
        if (this.isDragging) {
            // Trigger reorder event
            const event = new CustomEvent('reorder', {
                detail: {
                    items: Array.from(this.container.querySelectorAll('.draggable-item'))
                }
            });
            this.container.dispatchEvent(event);
        }
        
        this.isDragging = false;
        this.draggedItem = null;
        this.items = [];
    }
    
    reorderItems(draggedItem, targetItem) {
        const container = this.container;
        const items = Array.from(container.children);
        const draggedIndex = items.indexOf(draggedItem);
        const targetIndex = items.indexOf(targetItem);
        
        if (draggedIndex < targetIndex) {
            targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
        } else {
            targetItem.parentNode.insertBefore(draggedItem, targetItem);
        }
    }
}

export default TouchControls;
