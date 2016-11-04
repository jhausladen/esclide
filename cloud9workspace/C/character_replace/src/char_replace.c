#include <stdio.h>
#include <string.h>

int main(void) {
    char arr[] = "Blueberries";
    printf("%s (%zd != %zd)\n", arr, sizeof(arr), strlen(arr));
    strncpy(arr, "Rasp", 4);
    arr[8] = 'y';
    arr[9] = '\0';
    printf("%s (%zd != %zd)\n", arr, sizeof(arr), strlen(arr));
}
