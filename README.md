this is a js implementation of a value noise function which gives you the slope for your point (x, y) as well as the value. this is useful for terrain generation and other sorts of procedural generation. examples include constraining vegetation to level areas, distortion effects, or deepening water erosion channels on steeper surfaces. 

note that you can get the facing from the slope by getting Math.atan2(y slope, x slope). this is useful for such things as placing spokelike features, or applying directionally dependent processes to sand dunes.

the value returned is in the format { value, x slope, y slope}. 

normally, value noise is interpolated using a blend function. by getting the derivative of this, we can directly get slope at an arbitrary location without sampling multiple points on the curve. this approach generalizes to n dimensions.

this uses the blending function 6t^5 - 15t^4 + 10t^3
this has a derivative of 0 at 0 and 1, which helps us a lot with smoothness of the derivative (which is one step less smooth than the height). you can do this with a lower order function, such as 3x^2 - 2x^3, but i find that the artifacts are quite visible
