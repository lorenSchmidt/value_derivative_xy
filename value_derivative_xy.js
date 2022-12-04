
/* 
--------------------------------------------------------------------------------

value noise with derivative

--------------------------------------------------------------------------------
this gives you value and slope for a point (x, y) in the format { value, sx, sy}
this has a built in interpolation function. by getting the derivative of this, we can directly get slope at an arbitrary location without sampling multiple points on the curve. this approach generalizes to n dimensions.
*/
function value_derivative_xy( x, y, xsize = 256, ysize = 256, 
                       density = 1, octaves = 8, ratio = 1/2 ) {
    let seed = noise_seed
    let octave_seed = seed
    let scaling_factor = 0 
    let res = density * 2 // octave 0 is not a single value, it's 4, which is the smallest which is relevant for value noise. starting with 1 would give us a flat plane with a random height for octave 0, which would just randomly offset our height without adding information.

    let output = { value: 0, sx: 0, sy: 0 }; amplitude = 1
    let sum = 0; slope_x_sum = 0; slope_y_sum = 0
    
    for (let o = 0; o < octaves; o ++) {
        // note: the value noise uses a simple inline thing- LCG adjacent?
        octave_seed = (octave_seed + 239487234) % 293842387423
        seed = octave_seed
        
        let csx = xsize / res; csy = ysize / res // size of cell this octave
        let cx = (x / csx + res) % res; cy = (y / csy + res) % res 

        // position in cell, 0-1, for interpolation. cx, cy = 0, cx1, cy1 = 1
        let tx = cx % 1; ty = cy % 1  
        // the four corner indices
        cx = Math.floor(cx); cy = Math.floor(cy) 
        let cx1 = (cx + 1) % res; cy1 = (cy + 1) % res

        // corner values
        // we do an I for the value and x slope
        let ul = pos3(cx,   cy, seed)                         //   ul──┬──ur
        let ur = pos3(cx1,  cy, seed)                         //       │  
        let bl = pos3(cx,  cy1, seed)                         //       │   
        let br = pos3(cx1, cy1, seed)                         //   bl──┴──br

        // this uses the blending function 6t^5 - 15t^4 + 10t^3
        // this has a derivative of 0 at 0 and 1, which helps us a lot with smoothness of the derivative (which is one step less smooth than the height). you can do this with a lower order function, such as 3x^2 - 2x^3, but i find that the artifacts are quite visible
        let x_blend = 6 * tx ** 5 - 15 * tx ** 4 + 10 * tx ** 3
        let y_blend = 6 * ty ** 5 - 15 * ty ** 4 + 10 * ty ** 3
        let x_derivative_blend = 30 * tx ** 4 - 60 * tx ** 3 + 30 * tx ** 2
        let y_derivative_blend = 30 * ty ** 4 - 60 * ty ** 3 + 30 * ty ** 2

        // we do an I for the y derivative
        let v0 = ul + (ur - ul) * x_blend                       //   ──┬──  0
        let v1 = bl + (br - bl) * x_blend                       //     │
        let value = v0 + (v1 - v0) * y_blend - 0.5              //   ──┴──  1
        let sy    = (v1 - v0) * y_derivative_blend 
        
        // we do an H for the y slope and x derivative          //   │   │  0
        let sy0 = ul + (bl - ul) * y_blend                      //   ├───┤  
        let sy1 = ur + (br - ur) * y_blend                      //   │   │  1
        let sx  = (sy1 - sy0) * x_derivative_blend
        
        sum += amplitude * value
        slope_x_sum += sx; slope_y_sum += sy
        scaling_factor += amplitude

        res *= 2
        amplitude *= ratio
        // we increment after x and y slope earlier. this is for value.
        seed += pc_increment 
    }
    
    output.value = 2 * sum / scaling_factor
    output.sx = slope_x_sum; output.sy = slope_y_sum
    return output
}
/* this evaluates as -1 to 1, very center weighted 
(seed 32279)
-1.0 - -0.9  
-0.9 - -0.8  ▓
-0.8 - -0.7  ▓
-0.7 - -0.6  ▓
-0.6 - -0.5  ▓▓
-0.5 - -0.4  ▓▓▓▓
-0.4 - -0.3  ▓▓▓▓▓▓▓▓
-0.3 - -0.2  ▓▓▓▓▓▓▓▓▓▓▓▓
-0.2 - -0.1  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
-0.1 -  0.0  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 0.0 -  0.1  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 0.1 -  0.2  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 0.2 -  0.3  ▓▓▓▓▓▓▓▓▓▓▓▓
 0.3 -  0.4  ▓▓▓▓▓▓▓▓
 0.4 -  0.5  ▓▓▓▓▓
 0.5 -  0.6  ▓▓
 0.6 -  0.7  ▓
 0.7 -  0.8  ▓
 0.8 -  0.9  
 0.9 -  1.0  
*/



/* 
--------------------------------------------------------------------------------

positional random number generation

--------------------------------------------------------------------------------
for 2d value noise, we need to be able to input two coordinates and a seed, and
get a deterministic value for that point in space. you can substitute other
approaches for this one- this is a relatively simple, readable approach i came
up with but there are more cryptographically sound 3 input hashes out there.

note that if generalizing this for n dimensions, you'd want your number of dimensions plus one for the seed
*/

// three input positional noise. the output is 0-1
function pos3(x, y, seed) {
    let linear = (x % ns) + (y % ns) * ns + seed
    linear %= noise_table.length
    return noise_table[linear] / nt_size
}


// used for table setup only
var seed = 88883
var noise_table = []
var ns = 256
var nt_size = ns * ns
function init_random_table() {
    let list = []
    for (let a = 0; a < nt_size; a ++) {
        list.push(a)
    }
    for (let a = 0; a < nt_size; a ++) {
        noise_table[a] = draw_card(list)
    }
}


// used for table setup only
// picks a random element and returns it, removing it from the array
function draw_card(array) {
    var index = Math.floor(Math.random() * array.length);
    //console.log("index = " + index);
    var result = array[index];
    if (array.length > 0) {
        return (array.splice(index, 1))[0];
    }
    else
        return "ERROR: pick running on array of size 0";
}