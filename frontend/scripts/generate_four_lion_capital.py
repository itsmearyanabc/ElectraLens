#!/usr/bin/env python3
"""
High-Precision 3D Sculptor for the ElectraLens Four-Lion Capital
Generates a monumental, museum-grade 3D sculpture in binary GLB format.
"""

import math
import numpy as np
import trimesh
from trimesh import creation, transformations

def scale_xyz(sx, sy, sz):
    """Generates a 4x4 non-uniform scaling matrix."""
    return np.diag([sx, sy, sz, 1.0])

def create_revolved_surface(profile_points, radial_segments=64):
    """
    profile_points: list of (radius, y) points from bottom to top.
    Creates a smooth revolution around the Y-axis.
    """
    vertices = []
    indices = []
    n_pts = len(profile_points)

    thetas = np.linspace(0, 2 * math.pi, radial_segments, endpoint=False)
    cos_t = np.cos(thetas)
    sin_t = np.sin(thetas)

    for r, y in profile_points:
        for c, s in zip(cos_t, sin_t):
            vertices.append([r * c, y, r * s])

    vertices = np.array(vertices, dtype=np.float64)

    for i in range(n_pts - 1):
        for j in range(radial_segments):
            next_j = (j + 1) % radial_segments
            
            p0 = i * radial_segments + j
            p1 = i * radial_segments + next_j
            p2 = (i + 1) * radial_segments + j
            p3 = (i + 1) * radial_segments + next_j

            indices.append([p0, p1, p2])
            indices.append([p1, p3, p2])

    mesh = trimesh.Trimesh(vertices=vertices, faces=np.array(indices, dtype=np.int32))
    mesh.fix_normals()
    return mesh

def create_lotus_petal(width=0.22, height=0.68, thickness=0.07, segments=16):
    """Creates a single sculpted inverted lotus petal with central convex ridge and curled lip."""
    verts = []
    faces = []
    
    t_vals = np.linspace(0, 1, segments)
    for t in t_vals:
        # Width profile: narrow at base, wider at middle, tapering to rounded tip
        w = width * math.sin(t * math.pi) * (1.15 - 0.25 * t)
        y = t * height
        # Bell flare curvature
        z_curve = thickness * (math.sin(t * math.pi * 0.9) + 0.3 * (1.0 - t))
        
        # 5 cross-section points: left, mid-left, center ridge, mid-right, right
        verts.append([-w, y, 0.0])
        verts.append([-w * 0.5, y, z_curve * 0.75])
        verts.append([0.0, y, z_curve]) # central spine
        verts.append([w * 0.5, y, z_curve * 0.75])
        verts.append([w, y, 0.0])

    verts = np.array(verts, dtype=np.float64)
    for i in range(segments - 1):
        for j in range(4):
            p0 = i * 5 + j
            p1 = i * 5 + (j + 1)
            p2 = (i + 1) * 5 + j
            p3 = (i + 1) * 5 + (j + 1)
            faces.append([p0, p1, p2])
            faces.append([p1, p3, p2])

    mesh = trimesh.Trimesh(vertices=verts, faces=np.array(faces, dtype=np.int32))
    mesh.fix_normals()
    return mesh

def create_relief_chakra(radius=0.18, thickness=0.04, num_spokes=24):
    """Creates a 3D civic wheel / rosette (Chakra) with central hub, spokes, and outer rim."""
    meshes = []
    # Outer rim (torus-like ring)
    outer_rim = creation.annulus(r_min=radius * 0.82, r_max=radius, height=thickness)
    meshes.append(outer_rim)

    # Inner hub
    hub = creation.cylinder(radius=radius * 0.28, height=thickness * 1.25)
    meshes.append(hub)

    # Center jewel/dot
    hub_dot = creation.icosphere(subdivisions=2, radius=radius * 0.14)
    hub_dot.apply_translation([0, 0, thickness * 0.6])
    meshes.append(hub_dot)

    # Spokes
    for i in range(num_spokes):
        angle = (2 * math.pi / num_spokes) * i
        spoke = creation.cylinder(radius=radius * 0.024, height=radius * 0.75)
        # Rotate spoke to lay in XY plane
        spoke.apply_transform(transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
        # Rotate by angle
        spoke.apply_transform(transformations.rotation_matrix(angle, [0, 0, 1]))
        # Translate radially
        spoke.apply_translation([(radius * 0.45) * math.cos(angle + math.pi/2), (radius * 0.45) * math.sin(angle + math.pi/2), 0])
        meshes.append(spoke)

    chakra = trimesh.util.concatenate(meshes)
    return chakra

def create_mane_lock(length=0.35, width=0.12, depth=0.14, curl=0.25):
    """
    Creates an individual stylized sculptural flame-lock / curl of mane hair.
    Ashokan style features layered, volumetric teardrop curls that spiral outward.
    """
    segments = 14
    verts = []
    faces = []

    for i in range(segments):
        t = i / (segments - 1)
        # Profile scale
        s = math.sin(t * math.pi) * (1.0 - 0.4 * t)
        rx = width * s
        rz = depth * s
        
        # Downward length and forward/lateral curl curve
        y = -t * length
        z = curl * (math.sin(t * math.pi * 0.8) + 0.2 * t)
        x = curl * 0.3 * (t ** 1.5)

        # 6 radial points around the cross-section
        for j in range(6):
            th = (2 * math.pi / 6) * j
            vx = x + rx * math.cos(th)
            vz = z + rz * math.sin(th)
            verts.append([vx, y, vz])

    verts = np.array(verts, dtype=np.float64)
    for i in range(segments - 1):
        for j in range(6):
            next_j = (j + 1) % 6
            p0 = i * 6 + j
            p1 = i * 6 + next_j
            p2 = (i + 1) * 6 + j
            p3 = (i + 1) * 6 + next_j
            faces.append([p0, p1, p2])
            faces.append([p1, p3, p2])

    lock = trimesh.Trimesh(vertices=verts, faces=np.array(faces, dtype=np.int32))
    lock.fix_normals()
    return lock

def create_single_lion():
    """
    Sculpts one complete architectural lion facing +Z.
    Anatomy:
      - Forelegs & paws planted firmly on the abacus
      - Muscular puffed chest and clavicles
      - 5 tiers of stylized Mauryan curved mane locks
      - Architectural cranial vault, strong brow ridges
      - Almond eyes, defined snout and nostrils
      - Broad whisker pads, parted noble jaw with teeth
      - Sculpted feline ears with inner auricles
      - Seated haunches and solid back merging into central core
    """
    parts = []

    # 1. Muscular Torso & Chest
    chest_ellipsoid = creation.icosphere(subdivisions=3, radius=0.48)
    chest_ellipsoid.apply_transform(transformations.scale_matrix(0.9, [0, 0, 0]))
    chest_scale = np.array([
        [1.15, 0,    0,    0],
        [0,    1.45, 0,    0],
        [0,    0,    1.25, 0],
        [0,    0,    0,    1]
    ])
    chest_ellipsoid.apply_transform(chest_scale)
    chest_ellipsoid.apply_translation([0, 1.85, 0.28])
    parts.append(chest_ellipsoid)

    # 2. Pectoral muscle ridge / sternum
    sternum = creation.cylinder(radius=0.10, height=0.75)
    sternum.apply_transform(transformations.rotation_matrix(math.radians(-15), [1, 0, 0]))
    sternum.apply_translation([0, 1.80, 0.54])
    parts.append(sternum)

    # 3. Forelimbs (Left & Right Front Legs)
    for side in [-1, 1]:
        # Upper shoulder / bicep bulge
        shoulder = creation.icosphere(subdivisions=2, radius=0.22)
        shoulder.apply_transform(scale_xyz(1.0, 1.35, 1.1))
        shoulder.apply_translation([side * 0.38, 1.82, 0.36])
        parts.append(shoulder)

        # Foreleg pillar
        foreleg = creation.cylinder(radius=0.13, height=0.68)
        foreleg.apply_transform(transformations.rotation_matrix(math.radians(4), [1, 0, 0]))
        foreleg.apply_translation([side * 0.36, 1.35, 0.46])
        parts.append(foreleg)

        # Ankle / carpal joint
        ankle = creation.cylinder(radius=0.145, height=0.12)
        ankle.apply_translation([side * 0.36, 1.08, 0.48])
        parts.append(ankle)

        # Sculpted Paw
        paw_base = creation.box(extents=[0.26, 0.12, 0.32])
        paw_base.apply_translation([side * 0.36, 1.04, 0.54])
        parts.append(paw_base)

        # 4 Articulated Toes & Claws
        for toe_i in range(4):
            toe_x = side * (0.26 + toe_i * 0.065)
            toe = creation.icosphere(subdivisions=2, radius=0.062)
            toe.apply_transform(scale_xyz(0.9, 0.85, 1.5))
            toe.apply_translation([toe_x, 1.02, 0.68])
            parts.append(toe)

            # Claw tip
            claw = creation.cone(radius=0.024, height=0.06)
            claw.apply_transform(transformations.rotation_matrix(math.radians(-45), [1, 0, 0]))
            claw.apply_translation([toe_x, 1.00, 0.76])
            parts.append(claw)

    # 4. Flanks and Seated Haunches (merging back to center)
    for side in [-1, 1]:
        haunch = creation.icosphere(subdivisions=2, radius=0.34)
        haunch.apply_transform(scale_xyz(1.1, 1.3, 0.9))
        haunch.apply_translation([side * 0.44, 1.45, 0.08])
        parts.append(haunch)

    # 5. Head & Cranial Architecture
    cranium = creation.icosphere(subdivisions=3, radius=0.35)
    cranium_scale = np.array([
        [1.05, 0,    0,    0],
        [0,    1.15, 0,    0],
        [0,    0,    1.10, 0],
        [0,    0,    0,    1]
    ])
    cranium.apply_transform(cranium_scale)
    cranium.apply_translation([0, 2.58, 0.35])
    parts.append(cranium)

    # Strong sagittal crest / forehead plane
    crest = creation.cylinder(radius=0.08, height=0.38)
    crest.apply_transform(transformations.rotation_matrix(math.radians(35), [1, 0, 0]))
    crest.apply_translation([0, 2.76, 0.38])
    parts.append(crest)

    # Brow Ridges (Supraorbital arches)
    for side in [-1, 1]:
        brow = creation.cylinder(radius=0.06, height=0.22)
        brow.apply_transform(transformations.rotation_matrix(math.radians(side * 20), [0, 0, 1]))
        brow.apply_transform(transformations.rotation_matrix(math.radians(90), [0, 1, 0]))
        brow.apply_translation([side * 0.16, 2.65, 0.62])
        parts.append(brow)

        # Sculpted Almond Eyes
        eye_socket = creation.icosphere(subdivisions=2, radius=0.065)
        eye_socket.apply_transform(scale_xyz(1.4, 0.85, 0.9))
        eye_socket.apply_translation([side * 0.16, 2.56, 0.63])
        parts.append(eye_socket)

        # Raised pupil & eyelid crease
        pupil = creation.cylinder(radius=0.03, height=0.05)
        pupil.apply_transform(transformations.rotation_matrix(math.radians(90), [1, 0, 0]))
        pupil.apply_translation([side * 0.16, 2.56, 0.68])
        parts.append(pupil)

    # 6. Snout, Nose & Whisker Muzzle
    snout_bridge = creation.cylinder(radius=0.10, height=0.32)
    snout_bridge.apply_transform(transformations.rotation_matrix(math.radians(35), [1, 0, 0]))
    snout_bridge.apply_translation([0, 2.45, 0.64])
    parts.append(snout_bridge)

    # Nostril pad (fleshy nose)
    nose_pad = creation.box(extents=[0.18, 0.10, 0.14])
    nose_pad.apply_translation([0, 2.34, 0.77])
    parts.append(nose_pad)

    # Nostril flare holes
    for side in [-1, 1]:
        flare = creation.icosphere(subdivisions=2, radius=0.045)
        flare.apply_translation([side * 0.06, 2.33, 0.80])
        parts.append(flare)

    # Whisker pads (bilateral rounded muzzle)
    for side in [-1, 1]:
        muzzle_pad = creation.icosphere(subdivisions=2, radius=0.135)
        muzzle_pad.apply_transform(scale_xyz(1.1, 0.95, 1.25))
        muzzle_pad.apply_translation([side * 0.14, 2.26, 0.68])
        parts.append(muzzle_pad)

    # 7. Noble Open Jaw & Teeth
    # Upper lip / dental arch
    upper_lip = creation.cylinder(radius=0.19, height=0.08)
    upper_lip.apply_transform(transformations.rotation_matrix(math.radians(90), [1, 0, 0]))
    upper_lip.apply_translation([0, 2.22, 0.65])
    parts.append(upper_lip)

    # Lower jaw & chin
    lower_jaw = creation.box(extents=[0.24, 0.14, 0.28])
    lower_jaw.apply_transform(transformations.rotation_matrix(math.radians(-12), [1, 0, 0]))
    lower_jaw.apply_translation([0, 2.08, 0.62])
    parts.append(lower_jaw)

    # Chin boss
    chin = creation.icosphere(subdivisions=2, radius=0.10)
    chin.apply_translation([0, 2.04, 0.72])
    parts.append(chin)

    # Four Distinct Canine Teeth
    for side in [-1, 1]:
        # Upper canine
        upper_canine = creation.cone(radius=0.032, height=0.10)
        upper_canine.apply_transform(transformations.rotation_matrix(math.radians(180), [1, 0, 0]))
        upper_canine.apply_translation([side * 0.11, 2.18, 0.72])
        parts.append(upper_canine)

        # Lower canine
        lower_canine = creation.cone(radius=0.028, height=0.09)
        lower_canine.apply_translation([side * 0.09, 2.13, 0.70])
        parts.append(lower_canine)

    # 8. Sculpted Feline Ears
    for side in [-1, 1]:
        ear_base = creation.box(extents=[0.12, 0.16, 0.08])
        ear_base.apply_transform(transformations.rotation_matrix(math.radians(side * -25), [0, 0, 1]))
        ear_base.apply_transform(transformations.rotation_matrix(math.radians(-15), [1, 0, 0]))
        ear_base.apply_translation([side * 0.32, 2.82, 0.28])
        parts.append(ear_base)

        # Inner ear hollow
        ear_inner = creation.cone(radius=0.05, height=0.14)
        ear_inner.apply_transform(transformations.rotation_matrix(math.radians(side * -20), [0, 0, 1]))
        ear_inner.apply_translation([side * 0.30, 2.83, 0.31])
        parts.append(ear_inner)

    # 9. Stylized Concentric Mane Curls (Ashokan Tiered Locks)
    # Tier 1: Crown ruff around cranium and ears
    for i in range(11):
        angle = -math.pi * 0.45 + (math.pi * 0.9 / 10) * i
        lock = create_mane_lock(length=0.28, width=0.10, depth=0.12, curl=0.20)
        lock.apply_transform(transformations.rotation_matrix(angle, [0, 0, 1]))
        lock.apply_transform(transformations.rotation_matrix(math.radians(-25), [1, 0, 0]))
        lock.apply_translation([0.42 * math.sin(angle), 2.68 + 0.12 * math.cos(angle), 0.22])
        parts.append(lock)

    # Tier 2: Lateral cheek ruff & mandibular jaw beard
    for i in range(9):
        angle = -math.pi * 0.40 + (math.pi * 0.8 / 8) * i
        lock = create_mane_lock(length=0.32, width=0.11, depth=0.13, curl=0.24)
        lock.apply_transform(transformations.rotation_matrix(angle * 1.2, [0, 0, 1]))
        lock.apply_transform(transformations.rotation_matrix(math.radians(-15), [1, 0, 0]))
        lock.apply_translation([0.46 * math.sin(angle), 2.38 + 0.10 * math.cos(angle), 0.32])
        parts.append(lock)

    # Tier 3: Mid-neck collar of cascading volumetric locks
    for i in range(13):
        angle = -math.pi * 0.48 + (math.pi * 0.96 / 12) * i
        lock = create_mane_lock(length=0.38, width=0.12, depth=0.15, curl=0.28)
        lock.apply_transform(transformations.rotation_matrix(angle, [0, 0, 1]))
        lock.apply_transform(transformations.rotation_matrix(math.radians(10), [1, 0, 0]))
        lock.apply_translation([0.56 * math.sin(angle), 2.10 + 0.12 * math.cos(angle), 0.36])
        parts.append(lock)

    # Tier 4: Shoulder and upper chest mantle locks
    for i in range(11):
        angle = -math.pi * 0.42 + (math.pi * 0.84 / 10) * i
        lock = create_mane_lock(length=0.42, width=0.13, depth=0.16, curl=0.30)
        lock.apply_transform(transformations.rotation_matrix(angle * 0.9, [0, 0, 1]))
        lock.apply_transform(transformations.rotation_matrix(math.radians(20), [1, 0, 0]))
        lock.apply_translation([0.62 * math.sin(angle), 1.82 + 0.14 * math.cos(angle), 0.42])
        parts.append(lock)

    # Tier 5: Central chest bib cascading down sternum
    for i in range(5):
        offset_x = (i - 2) * 0.11
        lock = create_mane_lock(length=0.36, width=0.10, depth=0.13, curl=0.22)
        lock.apply_transform(transformations.rotation_matrix(math.radians(offset_x * 40), [0, 0, 1]))
        lock.apply_transform(transformations.rotation_matrix(math.radians(30), [1, 0, 0]))
        lock.apply_translation([offset_x, 1.62 - abs(offset_x) * 0.5, 0.52])
        parts.append(lock)

    # Combine into single lion mesh
    lion_mesh = trimesh.util.concatenate(parts)
    return lion_mesh

def create_architectural_base():
    """
    Builds the complete monumental architectural base:
      - Chamfered base plinth
      - Inverted bell / lotus capital with 24 sculpted petals and secondary petals
      - Beaded cord molding
      - Circular abacus frieze with 4 civic wheels (Chakras) and rosette reliefs
      - Upper capital lion support platform
    """
    base_parts = []

    # 1. Foundation Plinth Profile (tiered beveled ring at bottom)
    plinth_profile = [
        (1.28, 0.00),
        (1.28, 0.08),
        (1.22, 0.14),
        (1.18, 0.18),
        (1.14, 0.22),
    ]
    plinth = create_revolved_surface(plinth_profile, radial_segments=64)
    base_parts.append(plinth)

    # 2. Inverted Bell / Lotus Capital Core
    # In Ashokan architecture, this is the inverted bell shape supporting the petals
    bell_profile = [
        (1.14, 0.22),
        (1.12, 0.28),
        (1.05, 0.40),
        (0.96, 0.52),
        (0.90, 0.65),
        (0.86, 0.78),
        (0.88, 0.84),
        (0.94, 0.88),
    ]
    bell_core = create_revolved_surface(bell_profile, radial_segments=64)
    base_parts.append(bell_core)

    # 3. 24 Sculpted Radial Lotus Petals around the bell
    num_petals = 24
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        petal = create_lotus_petal(width=0.19, height=0.62, thickness=0.065)
        # Invert petal (hangs downward from waist)
        petal.apply_transform(transformations.rotation_matrix(math.pi, [1, 0, 0]))
        # Slant petal along bell curve
        petal.apply_transform(transformations.rotation_matrix(math.radians(-16), [1, 0, 0]))
        # Position at waist and radius
        petal.apply_translation([0, 0.84, 0.90])
        # Rotate radially around Y axis
        petal.apply_transform(transformations.rotation_matrix(angle, [0, 1, 0]))
        base_parts.append(petal)

    # 4. Secondary Petals (shorter, peeking out between the main petals)
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * (i + 0.5)
        sec_petal = create_lotus_petal(width=0.14, height=0.42, thickness=0.045)
        sec_petal.apply_transform(transformations.rotation_matrix(math.pi, [1, 0, 0]))
        sec_petal.apply_transform(transformations.rotation_matrix(math.radians(-14), [1, 0, 0]))
        sec_petal.apply_translation([0, 0.78, 0.94])
        sec_petal.apply_transform(transformations.rotation_matrix(angle, [0, 1, 0]))
        base_parts.append(sec_petal)

    # 5. Beaded Cable Molding (Torus ring above lotus)
    cable_profile = [
        (0.94, 0.88),
        (0.98, 0.90),
        (1.00, 0.93),
        (0.98, 0.96),
        (0.94, 0.98),
    ]
    cable_ring = create_revolved_surface(cable_profile, radial_segments=64)
    base_parts.append(cable_ring)

    # 6. Abacus Frieze Drum (Circular Drum)
    drum_profile = [
        (0.96, 0.98),
        (1.04, 1.00),
        (1.04, 1.28),
        (1.08, 1.30),
        (1.08, 1.36),
        (0.98, 1.36),
    ]
    abacus_drum = create_revolved_surface(drum_profile, radial_segments=64)
    base_parts.append(abacus_drum)

    # 7. Four 3D Relief Chakras (Civic Wheels) on the abacus frieze
    # Positioned at 45°, 135°, 225°, 315° (alternating with the cardinal lion axes)
    for k in range(4):
        angle = math.pi * 0.25 + (math.pi * 0.5) * k
        chakra = create_relief_chakra(radius=0.11, thickness=0.035, num_spokes=16)
        # Position on drum surface
        chakra.apply_translation([0, 0, 1.05])
        chakra.apply_transform(transformations.rotation_matrix(angle, [0, 1, 0]))
        chakra.apply_translation([0, 1.14, 0])
        base_parts.append(chakra)

    # 8. Central Pillar Core (Solid stone core supporting all 4 lions back-to-back)
    core_cylinder = creation.cylinder(radius=0.48, height=1.65)
    core_cylinder.apply_translation([0, 2.10, 0])
    base_parts.append(core_cylinder)

    return trimesh.util.concatenate(base_parts)

def build_four_lion_capital():
    """Assembles the complete Four-Lion Capital with 4 back-to-back lions and architectural base."""
    print("Sculpting single master lion...")
    master_lion = create_single_lion()
    print(f"Master lion generated: {len(master_lion.vertices)} vertices, {len(master_lion.faces)} faces")

    lions = []
    # 4 Cardinal Lions: 0° (+Z), 90° (+X), 180° (-Z), 270° (-X)
    for i in range(4):
        rot_angle = (math.pi / 2.0) * i
        lion_copy = master_lion.copy()
        lion_copy.apply_transform(transformations.rotation_matrix(rot_angle, [0, 1, 0]))
        lions.append(lion_copy)

    four_lions_mesh = trimesh.util.concatenate(lions)
    print(f"Four lions assembled: {len(four_lions_mesh.vertices)} vertices, {len(four_lions_mesh.faces)} faces")

    print("Building architectural base and inverted lotus capital...")
    base_mesh = create_architectural_base()
    print(f"Base generated: {len(base_mesh.vertices)} vertices, {len(base_mesh.faces)} faces")

    full_sculpture = trimesh.util.concatenate([base_mesh, four_lions_mesh])

    # Center origin and scale to comfortable height (~3.0 units total)
    # Move base to Y=0
    min_y = full_sculpture.bounds[0][1]
    full_sculpture.apply_translation([0, -min_y, 0])
    
    # Scale to normalize height to exactly 3.2 units
    height = full_sculpture.bounds[1][1] - full_sculpture.bounds[0][1]
    scale_factor = 3.2 / height
    full_sculpture.apply_scale(scale_factor)

    # Shift center of mass so rotation pivot is around the vertical axis at Y ~ 1.5
    full_sculpture.apply_translation([0, -0.2, 0])

    print("Baking vertex colors with ambient occlusion and sandstone patina...")
    # Compute ambient occlusion / height-based shading for rich museum sandstone look
    verts = full_sculpture.vertices
    y_coords = verts[:, 1]
    normals = full_sculpture.vertex_normals
    
    # Distance from center axis
    r_coords = np.sqrt(verts[:, 0]**2 + verts[:, 2]**2)

    # Base sandstone color: RGB (206, 172, 134)
    # Highlight color: RGB (226, 204, 174)
    # Crevice shadow color: RGB (138, 108, 78)
    colors = np.zeros((len(verts), 4), dtype=np.uint8)

    for i in range(len(verts)):
        y = y_coords[i]
        ny = normals[i][1]
        
        # Facing upward gets more light
        light_factor = 0.5 + 0.4 * ny
        # Higher points get slight sun exposure
        height_factor = min(1.0, max(0.0, (y - 0.5) / 2.5))
        # Deep inner crevice factor
        recess_factor = 1.0
        if r_coords[i] < 0.45 and 1.2 < y < 2.5:
            recess_factor = 0.65 # Inner shadow between lions

        t = np.clip(light_factor * (0.8 + 0.2 * height_factor) * recess_factor, 0.0, 1.2)

        r = int(np.clip(160 + 55 * t, 90, 240))
        g = int(np.clip(130 + 50 * t, 75, 215))
        b = int(np.clip(95 + 45 * t, 55, 185))
        colors[i] = [r, g, b, 255]

    full_sculpture.visual.vertex_colors = colors

    output_path = "public/models/four_lion_capital.glb"
    print(f"Exporting GLB to {output_path}...")
    full_sculpture.export(output_path)
    print("Export complete!")

if __name__ == "__main__":
    build_four_lion_capital()
