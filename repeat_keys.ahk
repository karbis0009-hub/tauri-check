#Requires AutoHotkey v2.0
#SingleInstance Force

SetKeyDelay 0, 0

z::RepeatKey("z")
c::RepeatKey("c")
f::RepeatKey("f")
r::RepeatKey("r")

RepeatKey(key) {
    Loop 15 {
        Send "{" key "}"
        Sleep 0
    }
}
