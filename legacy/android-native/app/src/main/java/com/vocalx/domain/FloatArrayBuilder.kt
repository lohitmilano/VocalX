package com.vocalx.domain

/**
 * Simple growable FloatArray builder to avoid heavy boxing from MutableList<Float>.
 */
internal class FloatArrayBuilder(initialCapacity: Int = 1024) {
    private var buf = FloatArray(initialCapacity.coerceAtLeast(1))
    var size: Int = 0
        private set

    fun append(value: Float) {
        ensureCapacity(size + 1)
        buf[size++] = value
    }

    fun appendAll(values: FloatArray, offset: Int = 0, length: Int = values.size - offset) {
        if (length <= 0) return
        ensureCapacity(size + length)
        values.copyInto(buf, destinationOffset = size, startIndex = offset, endIndex = offset + length)
        size += length
    }

    fun toArray(): FloatArray = buf.copyOf(size)

    private fun ensureCapacity(minCapacity: Int) {
        if (minCapacity <= buf.size) return
        var newCap = buf.size
        while (newCap < minCapacity) newCap = (newCap * 2).coerceAtLeast(8)
        buf = buf.copyOf(newCap)
    }
}


