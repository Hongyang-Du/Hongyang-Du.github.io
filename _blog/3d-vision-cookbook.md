---
title:          "A Cookbook of 3D Vision"
date:           2026-03-24
cover:          /assets/images/covers/cover5.png
description: >-
  Giving flat photos their third dimension back.
scripts:
  - /assets/js/blog/viz.js
  - /assets/js/blog/3d-guide.js
---

Look at any photo of a room and you immediately know which chair is closer and which wall is farther back. To a computer, that same photo is just a flat grid of pixel colors with no depth attached.

Getting the third dimension back from flat images is the core problem of 3D vision. Every figure below runs live in your browser, so drag the models around and try the sliders as you read.

## Why One Photo Is Ambiguous

When a camera takes a picture, it projects the 3D world onto a flat 2D sensor. Every point along the same line of sight lands on the exact same pixel, which erases distance. As a result, a small object close to the camera can look identical to a large object far away.

<div id="3d-ambiguity"></div>

Because a single view is ambiguous, 3D vision methods either combine multiple camera views (like human stereo vision) or learn prior knowledge from data about how everyday objects and rooms are shaped.

## Six Ways to Represent a 3D Shape

A 2D image has one standard format: a grid of pixels. In 3D, there is no single best format. Different representations trade off surface detail, memory usage, and how easily neural networks can process them.

Below is the same 3D bunny stored in six common formats. Switch between tabs, adjust the detail slider, and drag to rotate the model:

<div id="3d-shapes"></div>

A simple way to group these formats is by how they are created:

- **Captured by sensors:** Depth cameras and LiDAR scanners directly produce **depth images** and **point clouds**.
- **Built for geometry:** **Voxels** (3D grids) and **meshes** (connected polygon faces) are usually converted from sensor scans or designed by artists. Meshes are the standard format in games and films.
- **Learned from photos:** **Implicit fields** (such as NeRF) and **3D Gaussians** are not recorded directly by sensors. Instead, a computer optimizes them to match a collection of 2D photos.

## Learning 3D from 2D Photos

Often we only have ordinary 2D photos of an object taken from several angles, without any ground-truth 3D scan. We can still recover its 3D shape through **differentiable rendering**:

1. Start with a rough initial guess of the 3D scene, such as random colored blobs.
2. **Render** that guess from a camera viewpoint to create a synthetic image.
3. Compare the rendered image with the real photo, then slightly update the scene parameters using gradients to reduce the pixel error.

Repeating this loop thousands of times across multiple camera angles forces the scene into the true 3D geometry, since only the right 3D shape will match the photos from every viewpoint. You can run this optimization loop live on a 2D example below:

<div id="3d-fitting"></div>

## Rendering Speed: NeRF vs. 3D Gaussian Splatting

Because optimization renders the scene thousands of times, rendering speed is critical. Two rendering strategies define most modern 3D reconstruction methods:

<div id="3d-rendering"></div>

- **Ray marching (NeRF):** NeRF stores a scene inside a neural network. To color one pixel, it shoots a ray from the camera and queries the network at dozens of sample points along that ray. This produces sharp novel views, but running millions of network queries per frame makes rendering slow.
- **Splatting (3D Gaussian Splatting):** Instead of sampling along rays, Gaussian Splatting stores the scene explicitly as soft 3D ellipsoids and projects them directly onto the sensor. Rendering drops from seconds per frame to milliseconds, enabling real-time rendering and faster training.

## Feed-Forward 3D Models

Per-scene optimization produces high quality, but starting from scratch on every new scene takes minutes. Recent **feed-forward 3D models** such as DUSt3R and VGGT train a large network on millions of scenes so it can predict 3D structure from a few photos in a single forward pass, often in less than a second.

These models encode input photos with a shared Transformer backbone and attach lightweight output layers (**heads**) for specific 3D predictions:

<div id="3d-heads"></div>

A **point head** skips traditional feature matching and camera calibration altogether. It directly predicts the 3D `(x, y, z)` coordinates of every pixel in one shared coordinate system, so points from different views align right away.

## Applications

Recovering 3D structure from images supports several active areas in vision and robotics:

- **Text- and image-to-3D generation:** Turning text prompts or single photos into 3D objects and walkable scenes.
- **3D-consistent video generation:** Helping video models preserve object geometry when the camera moves.
- **Dynamic 4D scenes and world models:** Adding time to 3D representations for physical simulation and future prediction.
- **Robotics:** Giving robots 3D spatial understanding so they generalize better across viewpoints and tasks.

## Further Reading

For a full overview of 3D representations, datasets, learning paradigms, and applications, see our survey paper and repository:

- **Paper:** [A Cookbook of 3D Vision: Data, Learning Paradigms, and Application](https://openaccess.thecvf.com/content/CVPR2026W/OpenSUN3D/html/Du_A_Cookbook_of_3D_Vision_Data_Learning_Paradigms_and_Application_CVPRW_2026_paper.html) (CVPR 2026 Workshop) · [arXiv:2606.04291](https://arxiv.org/abs/2606.04291)
- **Papers and datasets:** [github.com/Hongyang-Du/awesome-3d-datasets](https://github.com/Hongyang-Du/awesome-3d-datasets)

Joint work with Zongxia Li, Dawei Liu, Runhao Li, Haoyuan Song, Qingyu Zhang, Yubo Wang, Jingcheng Ni, Shihang Gui, Congchao Dong, and Tao Hu.
