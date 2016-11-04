#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>

static char bar[] = { 'H', 'i', '!', '\n', '\0' };

static uint8_t *func (bool en, int size) {
    if (!en)
        return NULL;
    char foo[size];
    
    return bar;
}

int main(void) {
    printf("%s", func(1, 4));
}
