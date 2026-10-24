"""
Cosmic Tree  -  Python turtle edition
Coded by @hack.n.code  (https://www.instagram.com/hack.n.code/)

A glowing fractal tree grows from neon roots, branches out under the stars
and bursts into glowing blossoms.  Only the Python standard library is used.

Run:  python cosmic_tree.py      (click the window to grow a new tree)
"""
import math
import random
import turtle

W, H = 720, 960            # window size (portrait, like a phone)
BG = "#05030f"
MAX_DEPTH = 9
BLOSSOM_COLORS = ["#ff5fa8", "#ff3d8b", "#ff8fc7", "#e85cff", "#4ff0ff", "#b98cff", "#ffd1e6", "#7fe9ff"]

screen = turtle.Screen()
screen.setup(W, H)
screen.bgcolor(BG)
screen.title("Cosmic Tree - coded by @hack.n.code")
screen.colormode(255)
screen.tracer(0, 0)

pen = turtle.Turtle(visible=False)
pen.speed(0)
pen.penup()

steps = 0


def tick(every=6):
    """Refresh the screen every few strokes so the tree visibly grows."""
    global steps
    steps += 1
    if steps % every == 0:
        screen.update()


def hsl(h, s, l):
    """Small HSL -> (r, g, b) helper (h in degrees, s/l in 0..1)."""
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h // 60) % 6]
    return tuple(int((v + m) * 255) for v in (r, g, b))


def line(x1, y1, x2, y2, width, color):
    pen.goto(x1, y1)
    pen.pendown()
    pen.pensize(width)
    pen.pencolor(color)
    pen.goto(x2, y2)
    pen.penup()


def glow_line(x1, y1, x2, y2, width, rgb):
    """A soft halo, the colored stroke, then a hot white core = neon look."""
    halo = tuple(int(v * 0.35) for v in rgb)
    line(x1, y1, x2, y2, width * 2.6, halo)
    line(x1, y1, x2, y2, width, rgb)
    if width > 2:
        line(x1, y1, x2, y2, max(1, width * 0.3), (255, 245, 225))


def stars(n=260):
    for _ in range(n):
        pen.goto(random.uniform(-W / 2, W / 2), random.uniform(-H / 2, H / 2))
        shade = random.randint(120, 255)
        pen.dot(random.choice([1, 1, 1, 2, 2, 3]), (shade, shade, min(255, shade + 30)))


def ripples(cx, cy):
    """Neon rings around the base of the tree."""
    for i, col in enumerate([(79, 240, 255), (232, 92, 255), (79, 240, 255), (255, 160, 90)]):
        r = 40 + i * 48
        pen.pensize(2)
        pen.pencolor(tuple(int(v * (1 - i * 0.18)) for v in col))
        pen.goto(cx + r, cy)
        pen.pendown()
        for a in range(0, 361, 6):
            t = math.radians(a)
            pen.goto(cx + r * math.cos(t), cy + r * 0.22 * math.sin(t))
        pen.penup()
        screen.update()


def blossom(x, y, size):
    """A 5-petal glowing flower."""
    color = random.choice(BLOSSOM_COLORS)
    pen.goto(x, y)
    pen.dot(size * 2.4, tuple(int(int(color[i:i + 2], 16) * 0.25) for i in (1, 3, 5)))  # glow
    turn = random.uniform(0, 72)
    for k in range(5):
        a = math.radians(turn + k * 72)
        pen.goto(x + math.cos(a) * size * 0.5, y + math.sin(a) * size * 0.5)
        pen.dot(size * 0.75, color)
    pen.goto(x, y)
    pen.dot(size * 0.42, "#ffe08a")


blossoms = []


def branch(x, y, angle, length, width, depth):
    x2 = x + math.cos(math.radians(angle)) * length
    y2 = y + math.sin(math.radians(angle)) * length
    hue = (40 - depth / MAX_DEPTH * 85) % 360          # gold trunk -> pink tips
    glow_line(x, y, x2, y2, width, hsl(hue, 0.95, 0.55 + depth * 0.02))
    tick()
    if depth >= MAX_DEPTH or length < 4:
        blossoms.append((x2, y2))
        return
    if depth >= MAX_DEPTH - 4 and depth > 1 and random.random() < 0.4:
        blossoms.append((x2, y2))
    kids = 2 if depth < 2 or random.random() > 0.28 else 3
    spread = random.uniform(15, 22)
    for i in range(kids):
        offset = (spread if i else -spread) if kids == 2 else (i - 1) * spread * 1.15
        a = angle + offset + random.uniform(-7, 7)
        a += (90 - a) * 0.06                            # slight pull upward keeps the crown round
        branch(x2, y2, a, length * random.uniform(0.76, 0.86), max(1, width * 0.7), depth + 1)


def root(x, y, angle, length, width, depth):
    x2 = x + math.cos(math.radians(angle)) * length
    y2 = y + math.sin(math.radians(angle)) * length
    glow_line(x, y, x2, y2, width, hsl(28 + depth * 4, 1.0, 0.6 - depth * 0.05))
    tick()
    if depth < 4:
        for _ in range(random.choice([1, 2])):
            root(x2, y2, angle + random.uniform(-28, 28), length * random.uniform(0.62, 0.78), max(1, width * 0.66), depth + 1)


def grow(*_):
    blossoms.clear()
    pen.clear()
    stars()
    base_x, base_y = 0, -H * 0.3
    ripples(base_x, base_y)
    for i in range(6):
        root(base_x, base_y, -90 + (i - 2.5) * 24 + random.uniform(-8, 8), random.uniform(30, 42), 4, 0)
    branch(base_x, base_y, 90, H * 0.105, 8, 0)
    random.shuffle(blossoms)
    for n, (bx, by) in enumerate(blossoms):
        blossom(bx, by, random.uniform(9, 15))
        if n % 8 == 0:
            screen.update()
    pen.goto(0, H / 2 - 90)
    pen.pencolor("#ffe3ee")
    pen.write("Cosmic Tree", align="center", font=("Georgia", 34, "italic"))
    pen.goto(0, -H / 2 + 24)
    pen.pencolor("#ff9ec4")
    pen.write("coded by @hack.n.code", align="center", font=("Courier", 13, "bold"))
    screen.update()


grow()
screen.onclick(grow)
turtle.done()
